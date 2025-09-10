import debugModule from 'debug';
const debug = debugModule('webplsql:procedureSanitize');

import oracledb from 'oracledb';
import z from 'zod';
import {RequestError} from './requestError.js';
import {errorToString} from '../../util/errorToString.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('oracledb').Connection} Connection
 * @typedef {import('oracledb').Result<unknown>} Result
 * @typedef {import('../../types.js').argObjType} argObjType
 * @typedef {import('../../types.js').fileUploadType} fileUploadType
 * @typedef {import('../../types.js').environmentType} environmentType
 * @typedef {import('../../types.js').configPlSqlHandlerType} configPlSqlHandlerType
 * @typedef {import('../../types.js').BindParameterConfig} BindParameterConfig
 */

const DEFAULT_EXCLUSION_LIST = ['sys.', 'dbms_', 'utl_', 'owa_', 'htp.', 'htf.', 'wpg_docload.', 'ctxsys.', 'mdsys.'];

// NOTE: Consider using a separate cache for each database pool to avoid possible conflicts.
/**
 * @typedef {{hitCount: number, valid: boolean}} cacheEntryType
 */
/** @type {Map<string, cacheEntryType>} */
const REQUEST_VALIDATION_FUNCTION_CACHE = new Map();
const REQUEST_VALIDATION_FUNCTION_CACHE_MAX_COUNT = 10000;

/**
 * Sanitize the procedure name.
 *
 * @param {string} procName - The procedure name.
 * @param {Connection} databaseConnection - The database connection
 * @param {configPlSqlHandlerType} options - the options for the middleware.
 * @returns {Promise<string>} Promise resolving to final procedure name.
 */
export const sanitizeProcName = async (procName, databaseConnection, options) => {
	debug('sanitizeProcName', procName);

	// make lowercase and trim
	let finalProcName = procName.toLowerCase().trim();

	// remove special characters
	finalProcName = removeSpecialCharacters(finalProcName);

	// check for default exclusions
	for (const i of DEFAULT_EXCLUSION_LIST) {
		if (finalProcName.startsWith(i)) {
			const error = `Procedure name "${procName}" is in default exclusion list "${DEFAULT_EXCLUSION_LIST.join(',')}"`;
			debug(error);
			throw new RequestError(error);
		}
	}

	// check for custom exclusions
	if (options.exclusionList && options.exclusionList.length > 0) {
		for (const i of options.exclusionList) {
			if (finalProcName.startsWith(i)) {
				const error = `Procedure name "${procName}" is in custom exclusion list "${options.exclusionList.join(',')}"`;
				debug(error);
				throw new RequestError(error);
			}
		}
	}

	// Check request validation function
	if (options.requestValidationFunction && options.requestValidationFunction.length > 0) {
		const valid = await requestValidationFunction(finalProcName, options.requestValidationFunction, databaseConnection);
		if (!valid) {
			const error = `Procedure name "${procName}" is not valid according to the request validation function "${options.requestValidationFunction}"`;
			debug(error);
			throw new RequestError(error);
		}
	}

	return finalProcName;
};

/**
 * @param {string} str - string
 * @returns {string} - string
 */
const removeSpecialCharacters = (str) => {
	if (str === null || str === undefined) {
		return '';
	}

	const chars = [];

	for (const c of str) {
		if ((c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c === '.' || c === '_' || c === '#' || c === '$') {
			chars.push(c);
		}
	}

	return chars.join('');
};

/**
 * @param {string} procName - The procedure name.
 * @param {string} requestValidationFunction -  The request validation function.
 * @param {Connection} databaseConnection - The database connection
 * @returns {Promise<boolean>} Promise resolving to final procedure name.
 */
const loadRequestValid = async (procName, requestValidationFunction, databaseConnection) => {
	/** @type {BindParameterConfig} */
	const bind = {
		proc: {dir: oracledb.BIND_IN, type: oracledb.STRING, val: procName},
		valid: {dir: oracledb.BIND_OUT, type: oracledb.NUMBER},
	};

	const SQL = [
		'DECLARE',
		'   l_valid NUMBER := 0;',
		'BEGIN',
		`   IF (${requestValidationFunction}(:proc)) THEN`,
		'      l_valid := 1;',
		'   END IF;',
		'   :valid := l_valid;',
		'END;',
	].join('\n');

	/** @type {Result} */
	let result = {};
	try {
		result = await databaseConnection.execute(SQL, bind);
	} catch (err) {
		debug('result', result);
		/* istanbul ignore next */
		const message = `Error when validating procedure name "${procName}"\n${SQL}\n${errorToString(err)}`;
		/* istanbul ignore next */
		throw new RequestError(message);
	}

	try {
		const data = z.strictObject({valid: z.number()}).parse(result.outBinds);
		return data.valid === 1;
	} catch (err) {
		debug('result', result.outBinds);
		/* istanbul ignore next */
		const message = `Internal error when parsing ${result.outBinds}\n${errorToString(err)}`;
		/* istanbul ignore next */
		throw new Error(message);
	}
};

/**
 *	Remove the cache entries with the lowest hitCount.
 *	@param {number} count - Number of entries to remove
 *	@returns {void}
 */
const removeLowestHitCountEntries = (count) => {
	// Convert cache entries to an array
	const entries = Array.from(REQUEST_VALIDATION_FUNCTION_CACHE.entries());

	// Sort entries by hitCount in ascending order
	entries.sort((a, b) => a[1].hitCount - b[1].hitCount);

	// Get the keys of the `count` entries with the lowest hitCount
	const keysToRemove = entries.slice(0, count).map(([key]) => key);

	// Remove these entries from the cache
	for (const key of keysToRemove) {
		REQUEST_VALIDATION_FUNCTION_CACHE.delete(key);
	}
};

/**
 * Request validation function.
 *
 * @param {string} procName - The procedure name.
 * @param {string} requestValidationFunction -  The request validation function.
 * @param {Connection} databaseConnection - The database connection
 * @returns {Promise<boolean>} Promise resolving to final procedure name.
 */
const requestValidationFunction = async (procName, requestValidationFunction, databaseConnection) => {
	debug('requestValidationFunction', procName, requestValidationFunction);

	// calculate the key
	//const key = `${databaseConnection.connectString}_${databaseConnection.user}_${procName.toLowerCase()}`;
	const key = procName.toLowerCase();

	// lookup in the cache
	const cacheEntry = REQUEST_VALIDATION_FUNCTION_CACHE.get(key);

	// if we fount the procedure in the cache, we increase the hit cound and return
	if (cacheEntry) {
		cacheEntry.hitCount++;
		if (debug.enabled) {
			debug(`findArguments: procedure "${procName}" found in cache with "${cacheEntry.hitCount}" hits`);
		}
		return cacheEntry.valid;
	}

	// if the cache is full, we remove the 1000 least used cache entries
	if (REQUEST_VALIDATION_FUNCTION_CACHE.size > REQUEST_VALIDATION_FUNCTION_CACHE_MAX_COUNT) {
		if (debug.enabled) {
			debug(`findArguments: cache is full. size=${REQUEST_VALIDATION_FUNCTION_CACHE.size} max=${REQUEST_VALIDATION_FUNCTION_CACHE_MAX_COUNT}`);
		}
		removeLowestHitCountEntries(1000);
	}

	// load from database
	if (debug.enabled) {
		debug(`findArguments: procedure "${procName}" not found in cache and must be loaded`);
	}
	const valid = await loadRequestValid(procName, requestValidationFunction, databaseConnection);

	// add to the cache
	REQUEST_VALIDATION_FUNCTION_CACHE.set(key, {hitCount: 0, valid});

	return valid;
};
