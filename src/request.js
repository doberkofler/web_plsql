/*
 *	Process the http request
 */

import debugModule from 'debug';
const debug = debugModule('webplsql:request');

import util from 'node:util';
import oracledb from 'oracledb';
import {invokeProcedure} from './procedure.js';
import {getCGI} from './cgi.js';
import {getFiles} from './fileUpload.js';
import {RequestError} from './requestError.js';
import {Trace} from './trace.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('oracledb').Pool} Pool
 * @typedef {import('oracledb').Connection} Connection
 * @typedef {import('./types.js').argObjType} argObjType
 * @typedef {import('./types.js').middlewareOptions} middlewareOptions
 */

/**
 *	Is the given value a string or an array of strings
 *	@param {unknown} value - The value to check.
 *	@returns {value is string | string[]} - True if the value is a string or an array of strings
 */
const isStringOrArrayOfString = (value) => {
	/* istanbul ignore next */
	return typeof value === 'string' || (Array.isArray(value) && value.every((element) => typeof element === 'string'));
};

/**
 * Process the request
 *
 * @param {Request} req - The req object represents the HTTP request.
 * @param {Response} res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {Pool} connectionPool - The connection pool.
 * @param {middlewareOptions} options - the options for the middleware.
 * @param {Trace} trace - Tracing object.
 * returns {Promise<void>} - Promise that resolves when the request has been fullfilled.
 */
export async function processRequest(req, res, connectionPool, options, trace) {
	trace.write('processRequest: ENTER');

	/** @type {oracledb.Connection} */
	let connection;

	// open database connection
	try {
		connection = await connectionPool.getConnection();
		trace.write('processRequest: Connection has been allocated');
	} catch (err) {
		/* istanbul ignore next */
		throw new RequestError(`Unable to open database connection\n${err instanceof Error ? err.message : ''}`);
	}

	// execute request
	await executeRequest(req, res, options, connection, trace);

	// close database connection
	try {
		await connection.release();
		trace.write('processRequest: Connection has been released');
	} catch (err) {
		/* istanbul ignore next */
		throw new RequestError(`Unable to release database connection\n${err instanceof Error ? err.message : ''}`);
	}

	trace.write('processRequest: EXIT');
}

/**
 * Execute the request
 *
 * @param {Request} req - The req object represents the HTTP request.
 * @param {Response} res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {middlewareOptions} options - the options for the middleware.
 * @param {Connection} databaseConnection - Database connection.
 * @param {Trace} trace - Tracing object.
 * @returns {Promise<void>} - Promise resolving to th page
 */
const executeRequest = async (req, res, options, databaseConnection, trace) => {
	trace.write('executeRequest: ENTER');

	// Get the CGI
	const cgiObj = getCGI(req, options);
	debug('executeRequest: cgiObj=', cgiObj);

	// Add the query properties
	/** @type {argObjType} */
	const argObj = {};
	Object.assign(argObj, req.query);

	// Does the request contain any files
	const filesToUpload = getFiles(req);
	debug('executeRequest: filesToUpload=', filesToUpload);
	trace.write(`executeRequest: "${filesToUpload.length}" files to upload:\n${Trace.inspect(filesToUpload)}`);
	/* istanbul ignore next */
	if (filesToUpload.length > 0 && (typeof options.doctable !== 'string' || options.doctable.length === 0)) {
		const error = 'Unable to upload files if no document table "doctable" has been configured';
		trace.write(error);
		throw new RequestError(error);
	}

	// Add the files to the arguments
	filesToUpload.reduce((aggregator, file) => {
		aggregator[file.fieldname] = file.originalname;
		return aggregator;
	}, argObj);

	// Does the request contain a body
	Object.assign(argObj, normalizeBody(req));

	// invoke the Oracle procedure and get the page contenst
	await invokeProcedure(req, res, argObj, cgiObj, filesToUpload, options, databaseConnection, trace);

	trace.write('executeRequest: EXIT');
};

/**
 *	Normalize the body by making sure that only "simple" parameters and no nested objects are submitted
 *	@param {Request} req - The req object represents the HTTP request.
 *	@returns {Record<string, string | string[]>} - The normalized body.
 */
function normalizeBody(req) {
	/** @type {Record<string, string | string[]>} */
	const args = {};

	/* istanbul ignore else */
	if (typeof req.body === 'object' && req.body !== null) {
		for (const key in req.body) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			const value = req.body[key];
			/* istanbul ignore else */
			if (isStringOrArrayOfString(value)) {
				args[key] = value;
			} else {
				/* istanbul ignore next */
				throw new RequestError(
					`The element "${key}" in the body is not a string or an array of strings!\n${util.inspect(req.body, {showHidden: false, depth: null, colors: false})}`,
				);
			}
		}
	}

	return args;
}
