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
 * @typedef {import('../../util/cache.js').Cache<string>} ProcedureNameCache
 */

const DEFAULT_EXCLUSION_LIST = ['sys.', 'dbms_', 'utl_', 'owa_', 'htp.', 'htf.', 'wpg_docload.', 'ctxsys.', 'mdsys.'];

import {Cache} from '../../util/cache.js';
/** @type {Cache<{valid: boolean}>} */
const validationFunctionCache = new Cache();

/**
 * Resolve the procedure name using dbms_utility.name_resolve.
 *
 * @param {string} procName - The procedure name to resolve.
 * @param {Connection} databaseConnection - The database connection.
 * @param {ProcedureNameCache} procedureNameCache - The procedure name cache.
 * @returns {Promise<string>} - The resolved canonical procedure name (SCHEMA.NAME).
 */
const resolveProcedureName = async (procName, databaseConnection, procedureNameCache) => {
	// Check cache
	const cachedName = procedureNameCache.get(procName);
	if (cachedName) {
		debug(`resolveProcedureName: Cache hit for "${procName}" -> "${cachedName}"`);
		return cachedName;
	}

	debug(`resolveProcedureName: Cache miss for "${procName}". Resolving in DB...`);

	const sql = `
		DECLARE
			l_schema VARCHAR2(128);
			l_part1  VARCHAR2(128);
			l_part2  VARCHAR2(128);
			l_dblink VARCHAR2(128);
			l_part1_type NUMBER;
			l_object_number NUMBER;
		BEGIN
			dbms_utility.name_resolve(
				name => :name,
				context => 1,
				schema => l_schema,
				part1 => l_part1,
				part2 => l_part2,
				dblink => l_dblink,
				part1_type => l_part1_type,
				object_number => l_object_number
			);
			
			-- Reconstruct the canonical name
			-- If it's a package procedure: schema.package.procedure
			-- If it's a standalone procedure: schema.procedure
			
			IF l_part1 IS NOT NULL THEN
				:resolved := l_schema || '.' || l_part1 || '.' || l_part2;
			ELSE
				:resolved := l_schema || '.' || l_part2;
			END IF;
		END;
	`;

	const bind = {
		name: {dir: oracledb.BIND_IN, type: oracledb.STRING, val: procName},
		resolved: {dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 400},
	};

	try {
		const result = await databaseConnection.execute(sql, bind);
		const {resolved} = z.object({resolved: z.string()}).parse(result.outBinds);

		if (!resolved) {
			throw new RequestError(`Could not resolve procedure name "${procName}"`);
		}

		debug(`resolveProcedureName: Resolved "${procName}" -> "${resolved}"`);

		// Update cache
		procedureNameCache.set(procName, resolved);

		return resolved;
	} catch (err) {
		/* v8 ignore start */
		debug(`resolveProcedureName: Error resolving "${procName}"`, err);
		/* v8 ignore stop */

		// Rethrow as RequestError to indicate 404/403
		throw new RequestError(`Procedure "${procName}" not found or not accessible.\n${errorToString(err)}`);
	}
};

/**
 * Sanitize the procedure name.
 *
 * @param {string} procName - The procedure name.
 * @param {Connection} databaseConnection - The database connection
 * @param {configPlSqlHandlerType} options - the options for the middleware.
 * @param {ProcedureNameCache} procedureNameCache - The procedure name cache.
 * @returns {Promise<string>} Promise resolving to final procedure name.
 */
export const sanitizeProcName = async (procName, databaseConnection, options, procedureNameCache) => {
	debug('sanitizeProcName', procName);

	// make lowercase and trim
	let finalProcName = procName.toLowerCase().trim();

	// remove special characters (basic sanity check before DB call)
	finalProcName = removeSpecialCharacters(finalProcName);

	// check for default exclusions
	for (const i of DEFAULT_EXCLUSION_LIST) {
		if (finalProcName.startsWith(i)) {
			const error = `Procedure name "${procName}" is in default exclusion list "${DEFAULT_EXCLUSION_LIST.join(',')}"`;
			/* v8 ignore start */
			debug(error);
			/* v8 ignore stop */

			throw new RequestError(error);
		}
	}

	// check for custom exclusions
	if (options.exclusionList && options.exclusionList.length > 0) {
		for (const i of options.exclusionList) {
			if (finalProcName.startsWith(i)) {
				const error = `Procedure name "${procName}" is in custom exclusion list "${options.exclusionList.join(',')}"`;
				/* v8 ignore start */
				debug(error);
				/* v8 ignore stop */

				throw new RequestError(error);
			}
		}
	}

	// Check request validation function
	if (options.requestValidationFunction && options.requestValidationFunction.length > 0) {
		// Note: We might want to scope this cache too, but for now let's focus on the procedure name cache.
		// The original code used a global cache for this.
		// For strict correctness, we should probably verify the *resolved* name,
		// but legacy behavior checks the input name.
		const valid = await requestValidationFunction(finalProcName, options.requestValidationFunction, databaseConnection);
		if (!valid) {
			const error = `Procedure name "${procName}" is not valid according to the request validation function "${options.requestValidationFunction}"`;
			/* v8 ignore start */
			debug(error);
			/* v8 ignore stop */

			throw new RequestError(error);
		}
	}

	// NEW: Resolve the procedure name against the database
	// This prevents SQL injection and ensures the procedure exists
	const resolvedName = await resolveProcedureName(finalProcName, databaseConnection, procedureNameCache);

	return resolvedName;
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
		/* v8 ignore start */
		debug('result', result);
		/* v8 ignore stop */

		const message = `Error when validating procedure name "${procName}"\n${SQL}\n${errorToString(err)}`;
		throw new RequestError(message);
	}

	try {
		const data = z.strictObject({valid: z.number()}).parse(result.outBinds);
		return data.valid === 1;
	} catch (err) {
		/* v8 ignore start */
		debug('result', result.outBinds);
		/* v8 ignore stop */

		const message = `Internal error when parsing ${result.outBinds}\n${errorToString(err)}`;
		throw new Error(message);
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
	const key = procName.toLowerCase();

	// lookup in the cache
	const cacheEntry = validationFunctionCache.get(key);

	// if we found the procedure in the cache, we return it (hitCount already incremented by get)
	if (cacheEntry !== undefined) {
		/* v8 ignore start */
		if (debug.enabled) {
			debug(`requestValidationFunction: procedure "${procName}" found in cache`);
		}
		/* v8 ignore stop */

		return cacheEntry.valid;
	}

	// load from database
	/* v8 ignore start */
	if (debug.enabled) {
		debug(`requestValidationFunction: procedure "${procName}" not found in cache and must be loaded`);
	}
	/* v8 ignore stop */

	const valid = await loadRequestValid(procName, requestValidationFunction, databaseConnection);

	// add to the cache
	validationFunctionCache.set(key, {valid});

	return valid;
};
