/*
 *	Process the http request
 */

import debugModule from 'debug';
const debug = debugModule('webplsql:request');

import util from 'node:util';
import {invokeProcedure} from './procedure.js';
import {getCGI} from './cgi.js';
import {getFiles} from './upload.js';
import {RequestError} from './requestError.js';
import {isStringOrArrayOfString} from '../../util/type.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('oracledb').Pool} Pool
 * @typedef {import('oracledb').Connection} Connection
 * @typedef {import('../../types.js').argObjType} argObjType
 * @typedef {import('../../types.js').configPlSqlHandlerType} configPlSqlHandlerType
 */

/**
 * Execute the request
 *
 * @param {Request} req - The req object represents the HTTP request.
 * @param {Response} res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {configPlSqlHandlerType} options - the options for the middleware.
 * @param {Pool} connectionPool - The connection pool.
 * @returns {Promise<void>} - Promise resolving to th page
 */
export const processRequest = async (req, res, options, connectionPool) => {
	debug('processRequest: ENTER');

	//
	if (Array.isArray(req.params.name)) {
		console.warn(`processRequest: WARNING: the req.params.name is not a string but an array of string: ${req.params.name.join(',')}`);
	}

	// open database connection
	const connection = await connectionPool.getConnection();

	// Get the CGI
	const cgiObj = getCGI(req, options.documentTable ?? '', options.cgi ?? {});
	debug('processRequest: cgiObj=', cgiObj);

	// Does the request contain any files
	const filesToUpload = getFiles(req);
	debug('processRequest: filesToUpload=', filesToUpload);

	// Add the query properties
	/** @type {argObjType} */
	const argObj = {};
	Object.assign(argObj, req.query);

	// For add the files that must be uploaded, we now copy the actual filename to the appropriate parameter to the invoked procedure.
	filesToUpload.reduce((aggregator, file) => {
		aggregator[file.fieldname] = file.filename;
		return aggregator;
	}, argObj);

	// Does the request contain a body
	Object.assign(argObj, normalizeBody(req));
	debug('processRequest: argObj=', argObj);

	// invoke the Oracle procedure and get the page contenst
	await invokeProcedure(req, res, argObj, cgiObj, filesToUpload, options, connection);

	// transaction mode
	if (options.transactionMode === 'rollback') {
		debug('transactionMode: rollback');
		await connection.rollback();
	} else if (typeof options.transactionMode === 'function') {
		debug('transactionMode: callback');
		const result = options.transactionMode(connection, Array.isArray(req.params.name) ? req.params.name[0] : req.params.name);
		debug('transactionMode: callback restult', result);
		if (result && typeof result.then === 'function') {
			await result;
		}
	} else {
		debug('transactionMode: commit');
		await connection.commit();
	}

	// close database connection
	await connection.release();

	debug('processRequest: EXIT');
};

/**
 *	Normalize the body by making sure that only "simple" parameters and no nested objects are submitted
 *	@param {Request} req - The req object represents the HTTP request.
 *	@returns {Record<string, string | string[]>} - The normalized body.
 */
const normalizeBody = (req) => {
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
};
