// @flow

/*
*	Process the http request
*/

const debug = require('debug')('web_plsql:request');
const util = require('util');
const invoke = require('./procedure');
const getCGI = require('./cgi');
const files = require('./files');
const parseAndSend = require('./page');
const RequestError = require('./requestError');

import type {oracleExpressMiddleware$options} from './config';

/**
* Process the request
*
* @param {$Request} req - The req object represents the HTTP request.
* @param {$Response} res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
* @param {oracleExpressMiddleware$options} options - the options for the middleware.
* @param {Promise<oracledb$connectionpool>} databasePoolPromise - Promise returning a database pool.
* returns {Promise<void>} - Promise that resolves when the request has been fullfilled.
*/
async function processRequest(req: $Request, res: $Response, options: oracleExpressMiddleware$options, databasePoolPromise: Promise<oracledb$connectionpool>): Promise<void> {
	debug('processRequest: start');

	let databasePool;
	let databaseConnection;

	// wait until the database pool has been allocated
	try {
		databasePool = await databasePoolPromise;
	} catch (e) {
		throw new RequestError(`Unable to create database pool.\n${e.message}`);
	}

	// open database connection
	try {
		databaseConnection = await databasePool.getConnection();
	} catch (e) {
		throw new RequestError(`Unable to open database connection\n${e.message}`);
	}

	// execute request
	await executeRequest(req, res, options, databaseConnection);

	// close database connection
	try {
		await databaseConnection.release();
	} catch (e) {
		//throw new RequestError(`Unable to release database connection\n${e.message}`);
		console.error(`Unable to release database connection\n${e.message}`);
	}
}

/**
* Execute the request
*
* @param {$Request} req - The req object represents the HTTP request.
* @param {$Response} res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
* @param {oracleExpressMiddleware$options} options - the options for the middleware.
* @param {oracledb$connection} databaseConnection - Database connection.
* @returns {Promise<void>} - Promise resolving to th page
*/
async function executeRequest(req: $Request, res: $Response, options: oracleExpressMiddleware$options, databaseConnection: oracledb$connection): Promise<void> {
	debug('executeRequest: start');

	// Get the CGI
	const cgiObj = getCGI(req, options);
	debug('executeRequest: cgiObj', cgiObj);

	// Add the query properties
	const argObj = {};
	Object.assign(argObj, req.query);

	// Does the request contain any files
	const filesToUpload = files.getFiles(req);
	debug('executeRequest: filesToUpload', filesToUpload);
	if (filesToUpload.length > 0 && (typeof options.doctable !== 'string' || options.doctable.length === 0)) {
		throw new RequestError('Unable to upload files if no document table "doctable" has been configured');
	}

	// Add the files to the arguments
	filesToUpload.reduce((aggregator, file) => {
		aggregator[file.fieldValue] = file.filename;
		return aggregator;
	}, argObj);

	// Does the request contain a body
	Object.assign(argObj, normalizeBody(req));

	// invoke the Oracle procedure and get the page contenst
	const pageContent = await invoke(req, res, argObj, cgiObj, filesToUpload, options, databaseConnection);

	// Process the content and send the results to the client
	parseAndSend(req, res, options, pageContent);

	return Promise.resolve();
}

/*
*	Normalize the body by making sure that only "simple" parameters and no nested objects are submitted
*/
function normalizeBody(req: $Request): Object {
	const args = {};
	if (typeof req.body === 'object') {
		for (const key in req.body) {
			const value = req.body[key];
			if (isStringOrArrayOfString(value)) {
				args[key] = value;
			} else {
				throw new RequestError(`The element "${key}" in the body is not a string or an array of strings!\n` + util.inspect(req.body, {showHidden: false, depth: null, colors: false}));
			}
		}
	}

	return args;
}

/*
*	Is the given value a string or an array of strings
*/
function isStringOrArrayOfString(value: any): boolean {
	return typeof value === 'string' || (Array.isArray(value) && value.every(element => typeof element === 'string'));
}

module.exports = processRequest;
