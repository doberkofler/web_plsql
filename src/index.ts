/*
*	Express middleware for Oracle PL/SQL
*/

import url from 'url';
import express from 'express';
import oracledb from 'oracledb';
import {processRequest} from './request';
import {validate, oracleExpressMiddleware$options} from './config';
import {RequestError} from './requestError';
import {errorPage} from './errorPage';
import {Trace} from './trace';
const version = require('../package.json').version;

/**
* Express middleware.
*
* @param {Promise<oracledb.IConnectionPool>} databasePoolPromise - The promise that will be fullfilled when the database pool has been allocated.
* @param {Object} options - The configuration options.
* @returns {Function} - The request handler.
*/
const webplsql = function (databasePoolPromise: Promise<oracledb.IConnectionPool>, options: oracleExpressMiddleware$options) {
	// validate the configuration options
	const validOptions = validate(options);

	// instantiate trace object
	const trace = new Trace(validOptions.trace);

	return function handler(req: express.Request, res: express.Response/*, next: () => void*/) {
		requestHandler(req, res, databasePoolPromise, validOptions, trace);
	};
};

webplsql.version = version;
exports = module.exports = webplsql;

/*
* express.Request handler
*/
function requestHandler(req: express.Request, res: express.Response, databasePoolPromise: Promise<oracledb.IConnectionPool>, options: oracleExpressMiddleware$options, trace: Trace) {
	try {
		trace.start(req);

		// should we switch to the default page if there is one defined
		if (typeof req.params.name !== 'string' || req.params.name.length === 0) {
			if (typeof options.defaultPage === 'string' && options.defaultPage.length > 0) {
				const newUrl = url.resolve(req.originalUrl + '/' + options.defaultPage, '');
				trace.write(`Redirect to the url "${newUrl}"`);
				res.redirect(newUrl);
			} else {
				/* istanbul ignore next */
				errorPage(req, res, options, trace, new RequestError('No procedure name given and no default page has been specified'));
			}
		} else {
			processRequest(req, res, options, databasePoolPromise, trace)
				//@ts-ignore
				.catch(e => {
					/* istanbul ignore next */
					errorPage(req, res, options, trace, e);
				});
		}
	} catch (e) {
		/* istanbul ignore next */
		errorPage(req, res, options, trace, e);
	}
}
