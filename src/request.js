// @flow

/*
*	Process the http request
*/

const debug = require('debug')('oracleExpressMiddleware:request');
const util = require('util');
const _ = require('lodash');
const trace = require('./trace');
const Database = require('./database');
const invoke = require('./procedure');
const getCGI = require('./cgi');
const files = require('./files');
const parseAndSend = require('./page');
const error = require('./error');

import type {oracleExpressMiddleware$options} from './index';

/**
* Process the request
*
* @param {$Request} req - The req object represents the HTTP request.
* @param {$Response} res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
* @param {oracleExpressMiddleware$options} options - the options for the middleware.
* @param {Database} database - Database instance.
* @returns {Promise<void>} - Promise that resolves when the request has been fullfilled.
*/
async function processRequest(req: $Request, res: $Response, options: oracleExpressMiddleware$options, database: Database): Promise<void> {
	debug('processRequest: start');

	// open database connection
	try {
		await database.open(options.oracleUser, options.oraclePassword, options.oracleConnection);
	} catch (err) {
		error('Unable to open database connection', err);
	}

	// execute request
	try {
		await executeRequest(req, res, options, database);
	} catch (err) {
		error('Unable to execute request', err);
	}

	// close database connection
	try {
		await database.close();
	} catch (err) {
		error('Unable to close database connection', err);
	}

	return Promise.resolve();
}

/**
* Execute the request
*
* @param {$Request} req - The req object represents the HTTP request.
* @param {$Response} res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
* @param {oracleExpressMiddleware$options} options - the options for the middleware.
* @param {Database} database - Database instance.
* @returns {Promise<void>} - Promise resolving to th page
*/
async function executeRequest(req: $Request, res: $Response, options: oracleExpressMiddleware$options, database: Database): Promise<void> {
	debug('executeRequest: start', trace.traceReq(req));

	// Get the CGI
	const cgiObj = getCGI(req);
	debug('executeRequest: cgiObj', cgiObj);

	// Does the request contain any files
	const filesToUpload = files.getFiles(req);
	debug('executeRequest: filesToUpload', filesToUpload);

	// Does the request contain a body
	const argObj = _.assign(req.query, normalizeBody(req.body));

	// do we have a procedure to execute
	if (typeof req.params.name === 'string' && req.params.name.length > 0) {
		// invoke the Oracle procedure and get the page contenst
		const pageContent = await invoke(req.params.name, argObj, cgiObj, filesToUpload, options, database);

		// Process the content and send the results to the client
		parseAndSend(req, res, options, pageContent);
	}

	return Promise.resolve();
}

/*
*	Normalize the body by making sure that only "simple" parameters and no nested objects are submitted
*/
function normalizeBody(body: any): Object {
	const args = {};
	if (typeof body === 'object') {
		_.forEach(body, (value, key) => {
			if (isStringOrArrayOfString(value)) {
				args[key] = value;
			} else {
				error(`The element "${key}" in the body is not a string or an array of strings!\n` + util.inspect(body, {showHidden: false, depth: null, colors: false}));
			}
		});
	}

	return args;
}

/*
*	Is the given value a string or an array of strings
*/
function isStringOrArrayOfString(obj: any): boolean {
	return typeof obj === 'string' || (Array.isArray(obj) && _.every(obj, (element) => typeof element === 'string'));
}

module.exports = processRequest;
