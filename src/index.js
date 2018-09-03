// @flow

/*
*	Express middleware for Oracle PL/SQL
*/

const url = require('url');
const processRequest = require('./request');
const validate = require('./config');
const RequestError = require('./requestError');
const errorPage = require('./errorPage');
const Trace = require('./trace');
// $FlowFixMe
const version = require('../package.json').version;

import type {oracleExpressMiddleware$options} from './config';

/**
* Express middleware.
*
* @param {Promise<oracledb$connectionpool>} databasePoolPromise - The promise that will be fullfilled when the database pool has been allocated.
* @param {Object} options - The configuration options.
* @returns {Function} - The request handler.
*/
const webplsql = function (databasePoolPromise: Promise<oracledb$connectionpool>, options: oracleExpressMiddleware$options) {
	// validate the configuration options
	const validOptions = validate(options);

	// instantiate trace object
	const trace = new Trace(validOptions.trace);

	return function handler(req: $Request, res: $Response/*, next: () => void*/) {
		requestHandler(req, res, databasePoolPromise, validOptions, trace);
	};
};

webplsql.version = version;
exports = module.exports = webplsql;

/*
* Request handler
*/
function requestHandler(req: $Request, res: $Response, databasePoolPromise: Promise<oracledb$connectionpool>, options: oracleExpressMiddleware$options, trace: Trace) {
	try {
		trace.start(req);

		// should we switch to the default page if there is one defined
		if (typeof req.params.name !== 'string' || req.params.name.length === 0) {
			if (typeof options.defaultPage === 'string' && options.defaultPage.length > 0) {
				const newUrl = url.resolve(req.originalUrl + '/' + options.defaultPage, '');
				trace.write(`Redirect to the url "${newUrl}"`);
				res.redirect(newUrl);
			} else {
				errorPage(req, res, options, trace, new RequestError('No procedure name given and no default page has been specified'));
			}
		} else {
			processRequest(req, res, options, databasePoolPromise, trace)
				.catch(e => {
					errorPage(req, res, options, trace, e);
				});
		}
	} catch (e) {
		errorPage(req, res, options, trace, e);
	}
}
