/*
 *	Invoke the Oracle procedure and return the raw content of the page
 */

import debugModule from 'debug';
const debug = debugModule('webplsql:procedureNamed');

import oracledb from 'oracledb';
import z from 'zod';
import {RequestError} from './requestError.js';
import {errorToString} from '../../util/errorToString.js';
import {stringToNumber} from '../../util/util.js';
import {toTable, warningMessage} from '../../util/trace.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('oracledb').Connection} Connection
 * @typedef {import('oracledb').Result<unknown>} Result
 * @typedef {import('../../types.js').configPlSqlHandlerType} configPlSqlHandlerType
 * @typedef {import('../../types.js').argObjType} argObjType
 * @typedef {import('../../types.js').BindParameterConfig} BindParameterConfig
 * @typedef {import('../../types.js').BindParameter} BindParameter
 * @typedef {Record<string, string>} argsType
 * @typedef {{hitCount: number, args: argsType}} cacheEntryType
 */

const SQL_GET_ARGUMENT = [
	'DECLARE',
	'	schemaName		VARCHAR2(32767);',
	'	part1			VARCHAR2(32767);',
	'	part2			VARCHAR2(32767);',
	'	dblink			VARCHAR2(32767);',
	'	objectType		NUMBER;',
	'	objectID		NUMBER;',
	'BEGIN',
	'	dbms_utility.name_resolve(name=>UPPER(:name), context=>1, schema=>schemaName, part1=>part1, part2=>part2, dblink=>dblink, part1_type=>objectType, object_number=>objectID);',
	'	IF (part1 IS NOT NULL) THEN',
	'		SELECT argument_name, data_type BULK COLLECT INTO :names, :types FROM all_arguments WHERE owner = schemaName AND package_name = part1 AND object_name = part2 AND argument_name IS NOT NULL ORDER BY overload, sequence;',
	'	ELSE',
	'		SELECT argument_name, data_type BULK COLLECT INTO :names, :types FROM all_arguments WHERE owner = schemaName AND package_name IS NULL AND object_name = part2 AND argument_name IS NOT NULL ORDER BY overload, sequence;',
	'	END IF;',
	'END;',
].join('\n');

const DATA_TYPES = Object.freeze({
	VARCHAR2: 'VARCHAR2',
	CHAR: 'CHAR',
	BINARY_INTEGER: 'BINARY_INTEGER',
	NUMBER: 'NUMBER',
	DATE: 'DATE',
	CLOB: 'CLOB',
	PL_SQL_TABLE: 'PL/SQL TABLE',
	//	PL/SQL BOOLEAN
	//	PL/SQL RECORD
	//	OBJECT
	//	TABLE
	//	BLOB
	//	RAW
	//	VARRAY
	//	REF CURSOR
});

// NOTE: Consider using a separate cache for each database pool to avoid possible conflicts.
/** @type {Map<string, cacheEntryType>} */
const ARGS_CACHE = new Map();
const ARGS_CACHE_MAX_COUNT = 10000;

/**
 *	Retrieve the argument types for a given procedure to be executed.
 *	This is important because if the procedure is defined to take a PL/SQL indexed table,
 *	we must provise a table, even if there is only one argument to be submitted.
 *	@param {string} procedure - The procedure
 *	@param {Connection} databaseConnection - The database connection
 *	@returns {Promise<argsType>} - The argument types
 */
const loadArguments = async (procedure, databaseConnection) => {
	const MAX_PARAMETER_NUMBER = 1000;

	/** @type {BindParameterConfig} */
	const bind = {
		name: {dir: oracledb.BIND_IN, type: oracledb.STRING, val: procedure},
		names: {dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 60, maxArraySize: MAX_PARAMETER_NUMBER},
		types: {dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 60, maxArraySize: MAX_PARAMETER_NUMBER},
	};

	/** @type {Result} */
	let result = {};
	try {
		result = await databaseConnection.execute(SQL_GET_ARGUMENT, bind);
	} catch (err) {
		debug('result', result);
		const message = `Error when retrieving arguments\n${SQL_GET_ARGUMENT}\n${errorToString(err)}`;
		throw new RequestError(message);
	}

	/** @type {{names: string[], types: string[]}} */
	let data;
	try {
		data = z
			.object({
				names: z.array(z.string()),
				types: z.array(z.string()),
			})
			.parse(result.outBinds);
	} catch (err) {
		debug('result.outBinds', result.outBinds);
		const message = `Error when decoding arguments\n${SQL_GET_ARGUMENT}\n${errorToString(err)}`;
		throw new RequestError(message);
	}

	if (data.names.length !== data.types.length) {
		throw new RequestError('Error when decoding arguments. The number of names and types does not match');
	}

	/** @type {Record<string, string>} */
	const argTypes = {};
	for (let i = 0; i < data.names.length; i++) {
		argTypes[data.names[i].toLowerCase()] = data.types[i];
	}

	return argTypes;
};

/**
 *	Remove the cache entries with the lowest hitCount.
 *	@param {number} count - Number of entries to remove
 *	@returns {void}
 */
const removeLowestHitCountEntries = (count) => {
	// Convert cache entries to an array
	const entries = Array.from(ARGS_CACHE.entries());

	// Sort entries by hitCount in ascending order
	entries.sort((a, b) => a[1].hitCount - b[1].hitCount);

	// Get the keys of the `count` entries with the lowest hitCount
	const keysToRemove = entries.slice(0, count).map(([key]) => key);

	// Remove these entries from the cache
	for (const key of keysToRemove) {
		ARGS_CACHE.delete(key);
	}
};

/**
 *	Find the argument types for a given procedure to be executed.
 *	As the arguments are cached, we first look up the cache and only if not yet available we load them.
 *	@param {string} procedure - The procedure
 *	@param {Connection} databaseConnection - The database connection
 *	@returns {Promise<argsType>} - The argument types
 */
const findArguments = async (procedure, databaseConnection) => {
	const key = procedure.toUpperCase();

	// lookup in the cache
	const cacheEntry = ARGS_CACHE.get(key);

	// if we fount the procedure in the cache, we increase the hit cound and return
	if (cacheEntry) {
		cacheEntry.hitCount++;
		if (debug.enabled) {
			debug(`findArguments: procedure "${procedure}" found in cache with "${cacheEntry.hitCount}" hits`);
		}
		return cacheEntry.args;
	}

	// if the cache is full, we remove the 1000 least used cache entries
	if (ARGS_CACHE.size > ARGS_CACHE_MAX_COUNT) {
		if (debug.enabled) {
			debug(`findArguments: cache is full. size=${ARGS_CACHE.size} max=${ARGS_CACHE_MAX_COUNT}`);
		}
		removeLowestHitCountEntries(1000);
	}

	// load from database
	if (debug.enabled) {
		debug(`findArguments: procedure "${procedure}" not found in cache and must be loaded`);
	}
	const args = await loadArguments(procedure, databaseConnection);

	// add to the cache
	ARGS_CACHE.set(key, {hitCount: 0, args});

	return args;
};

/**
 *	Get the bindling for an argument.
 *	@param {string} argName - The argument name.
 *	@param {unknown} argValue - The argument value.
 *	@param {string} argType - The argument type.
 *	@returns {BindParameter} - The binding.
 */
export const getBinding = (argName, argValue, argType) => {
	if (argType === DATA_TYPES.VARCHAR2 || argType === DATA_TYPES.CHAR) {
		return {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VARCHAR, val: argValue};
	}

	if (argType === DATA_TYPES.CLOB) {
		return {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_CLOB, val: argValue};
	}

	if (argType === DATA_TYPES.NUMBER || argType === DATA_TYPES.BINARY_INTEGER) {
		const value = stringToNumber(argValue);
		if (value === null) {
			throw new Error(`Error in named parameter "${argName}": invalid value "${argValue}" for type "${argType}"`);
		}

		return {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_NUMBER, val: value};
	}

	if (argType === DATA_TYPES.DATE) {
		if (typeof argValue !== 'string') {
			throw new Error(`Error in named parameter "${argName}": invalid value "${argValue}" for type "${argType}"`);
		}
		const value = new Date(argValue);
		if (Number.isNaN(value.getTime())) {
			throw new Error(`Error in named parameter "${argName}": invalid value "${argValue}" for type "${argType}"`);
		}

		return {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VARCHAR, val: value};
	}

	if (argType === DATA_TYPES.PL_SQL_TABLE || Array.isArray(argValue)) {
		const value = typeof argValue === 'string' ? [argValue] : argValue;

		return {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_DATE, val: value};
	}

	throw new Error(`Error in named parameter "${argName}": invalid binding type "${argType}"`);
};

/**
 *	Get binding table for tracing.
 *	@param {argObjType} argObj - The arguments to pass to the procedure
 *	@param {argsType} argTypes - The argument types.
 *	@returns {string} - The text.
 */
const inspectBindings = (argObj, argTypes) => {
	const rows = Object.entries(argObj).map(([key, value]) => {
		return [key, value.toString(), typeof value, argTypes[key.toLowerCase()]];
	});

	const {text} = toTable(['id', 'value', 'value type', 'argument type'], rows);

	return text;
};

/**
 *	Get the sql statement and bindings for the procedure to execute for a fixed number of arguments
 *	@param {Request} req - The req object represents the HTTP request. (only used for debugging)
 *	@param {string} procName - The procedure to execute
 *	@param {argObjType} argObj - The arguments to pass to the procedure
 *	@param {Connection} databaseConnection - The database connection
 *	@returns {Promise<{sql: string; bind: BindParameterConfig}>} - The SQL statement and bindings for the procedure to execute
 */
export const getProcedureNamed = async (req, procName, argObj, databaseConnection) => {
	debug(`getProcedureNamed: ${procName} arguments=`, argObj);

	// get the types of the arguments
	const argTypes = await findArguments(procName, databaseConnection);

	/** @type {string[]} */
	const sqlParameter = [];

	/** @type {BindParameterConfig} */
	const bindings = {};

	// bindings for the statement
	for (const key in argObj) {
		const parameterName = `p_${key}`;
		const argValue = argObj[key];
		const argType = argTypes[key.toLowerCase()];
		/** @type {BindParameter} */
		let bind = {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_VARCHAR, val: argValue};

		if (argType) {
			bind = getBinding(key, argValue, argType);
		} else {
			const text = inspectBindings(argObj, argTypes);
			warningMessage({type: 'warning', message: `Error in named parameter "${key}": invalid binding type "${argType}"\n\n${text}`, req});
		}

		sqlParameter.push(`${key}=>:${parameterName}`);
		bindings[parameterName] = bind;
	}

	// select statement
	const sql = `${procName}(${sqlParameter.join(', ')})`;

	if (debug.enabled) {
		debug(sql);
		debug(inspectBindings(argObj, argTypes));
	}

	return {sql, bind: bindings};
};
