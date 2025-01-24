/*
 *	Express middleware for Oracle PL/SQL
 */

import url from 'node:url';
import {processRequest} from './request.js';
import {validate} from './config.js';
import {RequestError} from './requestError.js';
import {errorPage} from './errorPage.js';
import {Trace} from './trace.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 * @typedef {import('oracledb').Pool} Pool
 * @typedef {import('./types.js').environmentType} environmentType
 * @typedef {import('./types.js').middlewareOptions} middlewareOptions
 *
 * @typedef {(req: Request, res: Response, next: NextFunction) => void} middlewareFunctionType
 */

/**
 * express.Request handler
 * @param {Request} req - The req object represents the HTTP request.
 * @param {Response} res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {NextFunction} next - The next function.
 * @param {Pool} connectionPool - The connection pool.
 * @param {middlewareOptions} options - the options for the middleware.
 * @param {Trace} trace - Tracing object.
 */
const requestHandler = async (req, res, next, connectionPool, options, trace) => {
	trace.start(req);

	try {
		// should we switch to the default page if there is one defined
		if (typeof req.params.name !== 'string' || req.params.name.length === 0) {
			if (typeof options.defaultPage === 'string' && options.defaultPage.length > 0) {
				const newUrl = url.resolve(`${req.originalUrl}/${options.defaultPage}`, '');
				trace.write(`Redirect to the url "${newUrl}"`);
				res.redirect(newUrl);
			} else {
				/* istanbul ignore next */
				errorPage(req, res, options, trace, new RequestError('No procedure name given and no default page has been specified'));
			}
		} else {
			await processRequest(req, res, connectionPool, options, trace);
		}
	} catch (err) {
		/* istanbul ignore next */
		errorPage(req, res, options, trace, err);
	}
};

/**
 * Express middleware.
 *
 * @param {Pool} connectionPool - The connection pool.
 * @param {Partial<middlewareOptions>} options - The configuration options.
 * @returns {middlewareFunctionType} - The handler.
 */
const webplsqlMiddleware = (connectionPool, options) => {
	// validate the configuration options
	const validOptions = validate(options);

	// instantiate trace object
	const trace = new Trace(validOptions.trace);

	/**
	 * @param {Request} req - The req object represents the HTTP request.
	 * @param {Response} res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
	 * @param {NextFunction} next - The next function.
	 */
	const handler = (req, res, next) => {
		void requestHandler(req, res, next, connectionPool, validOptions, trace);
	};

	return handler;
};

export default webplsqlMiddleware;
