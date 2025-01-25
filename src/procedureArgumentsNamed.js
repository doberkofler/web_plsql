/*
 *	Invoke the Oracle procedure and return the raw content of the page
 */

import debugModule from 'debug';
const debug = debugModule('webplsql:procedureArgumentsNamed');

import oracledb from 'oracledb';
import z from 'zod';
import {RequestError} from './requestError.js';

/**
 * @typedef {import('oracledb').Connection} Connection
 * @typedef {import('oracledb').Result<unknown>} Result
 * @typedef {import('./types.js').argObjType} argObjType
 * @typedef {import('./types.js').BindParameterConfig} BindParameterConfig
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

/**
 *	Retrieve the argument types for a given procedure to be executed.
 *	This is important because if the procedure is defined to take a PL/SQL indexed table,
 *	we must provise a table, even if there is only one argument to be submitted.
 *	@param {string} procedure - The procedure
 *	@param {Connection} databaseConnection - The database connection
 *	@returns {Promise<Record<string, string>>} - The argument types
 */
const loadNamedArguments = async (procedure, databaseConnection) => {
	const MAX_PARAMETER_NUMBER = 1000;

	/** @type {BindParameterConfig} */
	const bind = {
		name: {dir: oracledb.BIND_IN, type: oracledb.STRING, val: procedure},
		names: {dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 60, maxArraySize: MAX_PARAMETER_NUMBER},
		types: {dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 60, maxArraySize: MAX_PARAMETER_NUMBER},
	};

	/** @type {Result} */
	let result;
	try {
		result = await databaseConnection.execute(SQL_GET_ARGUMENT, bind);
	} catch (err) {
		/* istanbul ignore next */
		const message = `Error when retrieving arguments\n${SQL_GET_ARGUMENT}\n${err instanceof Error ? err.stack : ''}`;
		/* istanbul ignore next */
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
		/* istanbul ignore next */
		const message = `Error when decoding arguments\n${SQL_GET_ARGUMENT}\n${err instanceof Error ? err.stack : ''}`;
		/* istanbul ignore next */
		throw new RequestError(message);
	}

	if (data.names.length !== data.types.length) {
		/* istanbul ignore next */
		throw new RequestError('Error when decoding arguments. The number of names and types does not match');
	}

	/** @type {Record<string, string>} */
	const argTypes = {};
	for (let i = 0; i < data.names.length; i++) {
		argTypes[data.names[i].toLowerCase()] = data.types[i];
	}

	return Promise.resolve(argTypes);
};

/**
 * Get the sql statement and bindings for the procedure to execute for a fixed number of arguments
 * @param {string} procedure - The procedure to execute
 * @param {argObjType} argObj - The arguments to pass to the procedure
 * @param {Connection} databaseConnection - The database connection
 * @returns {Promise<{sql: string; bind: BindParameterConfig}>} - The SQL statement and bindings for the procedure to execute
 */
export const getNamedArguments = async (procedure, argObj, databaseConnection) => {
	debug(`getNamedArguments: "${procedure}" argObj=`, argObj);

	/** @type {BindParameterConfig} */
	const bind = {};
	let index = 0;

	const argTypes = await loadNamedArguments(procedure, databaseConnection);

	// bindings for the statement
	let sql = `${procedure}(`;
	for (const key in argObj) {
		const value = argObj[key];
		const parameterName = `p_${key}`;

		// prepend the separator, if this is not the first argument
		if (index > 0) {
			sql += ',';
		}
		index++;

		// add the argument
		sql += `${key}=>:${parameterName}`;

		// add the binding
		bind[parameterName] = {dir: oracledb.BIND_IN, type: oracledb.STRING};

		// set the value or array of values
		if (Array.isArray(value) || argTypes[key] === 'PL/SQL TABLE') {
			/** @type {string[]} */
			const val = [];
			if (typeof value === 'string') {
				val.push(value);
			} else {
				value.forEach((element) => {
					val.push(element);
				});
			}
			bind[parameterName].val = val;
		} else if (typeof value === 'string') {
			bind[parameterName].val = value;
		}
	}
	sql += ');';

	return {sql, bind};
};
