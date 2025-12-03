/*
 *	Express middleware for Oracle PL/SQL
 */

import debugModule from 'debug';
const debug = debugModule('webplsql:handlerPlSql');

import url from 'node:url';
import {processRequest} from './request.js';
import {RequestError} from './requestError.js';
import {errorPage} from './errorPage.js';

/**
 * @typedef {import('express').RequestHandler} RequestHandler
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 * @typedef {import('oracledb').Pool} Pool
 * @typedef {import('../../types.js').environmentType} environmentType
 * @typedef {import('../../types.js').configPlSqlHandlerType} configPlSqlHandlerType
 */

/**
 * express.Request handler
 * @param {Request} req - The req object represents the HTTP request.
 * @param {Response} res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {NextFunction} next - The next function.
 * @param {Pool} connectionPool - The connection pool.
 * @param {configPlSqlHandlerType} options - the options for the middleware.
 */
const requestHandler = async (req, res, next, connectionPool, options) => {
	try {
		// should we switch to the default page if there is one defined
		if (typeof req.params.name !== 'string' || req.params.name.length === 0) {
			if (typeof options.defaultPage === 'string' && options.defaultPage.length > 0) {
				const newUrl = url.resolve(`${req.originalUrl}/${options.defaultPage}`, '');
				debug(`Redirect to the url "${newUrl}"`);
				res.redirect(newUrl);
			} else {
				errorPage(req, res, options, new RequestError('No procedure name given and no default page has been specified'));
			}
		} else {
			// request handler
			await processRequest(req, res, options, connectionPool);
		}
	} catch (err) {
		errorPage(req, res, options, err);
	}
};

/**
 * Express middleware.
 *
 * @param {Pool} connectionPool - The connection pool.
 * @param {configPlSqlHandlerType} config - The configuration options.
 * @returns {RequestHandler} - The handler.
 */
export const handlerWebPlSql = (connectionPool, config) => {
	debug('options', config);

	return (req, res, next) => {
		void requestHandler(req, res, next, connectionPool, config);
	};
};
