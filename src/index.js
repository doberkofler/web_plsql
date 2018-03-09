// @flow

/*
*	Express middleware for Oracle PL/SQL
*/

const url = require('url');
const processRequest = require('./request');
const validate = require('./config');
const RequestError = require('./requestError');
const errorPage = require('./errorPage');
const {Trace} = require('./trace');

import type {oracleExpressMiddleware$options} from './config';

/**
* Express middleware.
*
* @param {Promise<oracledb$connectionpool>} databasePoolPromise - The promise that will be fullfilled when the database pool has been allocated.
* @param {Object} options - The configuration options.
* @returns {Function} - The request handler.
*/
module.exports = function (databasePoolPromise: Promise<oracledb$connectionpool>, options: oracleExpressMiddleware$options) {
	// validate the configuration options
	const validOptions = validate(options);

	// instantiate trace object
	const trace = new Trace(validOptions.trace, validOptions.traceDirectory);

	return function (req: $Request, res: $Response/*, next: () => void*/) {
		trace.start(req);

		// should we switch to the default page if there is one defined
		if (typeof req.params.name !== 'string' || req.params.name.length === 0) {
			if (typeof validOptions.defaultPage === 'string' && validOptions.defaultPage.length > 0) {
				const newUrl = url.resolve(req.originalUrl + '/' + validOptions.defaultPage, '');
				trace.write(`Redirect to the url "${newUrl}"`);
				res.redirect(newUrl);
			} else {
				errorPage(req, res, validOptions, trace, new RequestError('No procedure name given and no default page has been specified'));
			}
		} else {
			processRequest(req, res, validOptions, databasePoolPromise, trace)
				.catch(e => {
					errorPage(req, res, validOptions, trace, e);
				});
		}
	};
};
