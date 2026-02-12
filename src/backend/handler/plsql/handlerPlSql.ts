/*
 *	Express middleware for Oracle PL/SQL
 */

import debugModule from 'debug';
const debug = debugModule('webplsql:handlerPlSql');

import url from 'node:url';
import {processRequest} from './request.ts';
import {RequestError} from './requestError.ts';
import {errorPage} from './errorPage.ts';
import {Cache} from '../../util/cache.ts';
import type {RequestHandler, Request, Response, NextFunction} from 'express';
import type {Pool} from 'oracledb';
import type {configPlSqlHandlerType, argsType} from '../../types.ts';

type WebPlSqlRequestHandler = RequestHandler & {
	procedureNameCache: Cache<string>;
	argumentCache: Cache<argsType>;
};

/**
 * express.Request handler
 * @param req - The req object represents the HTTP request.
 * @param res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param _next - The next function.
 * @param connectionPool - The connection pool.
 * @param options - the options for the middleware.
 * @param procedureNameCache - The procedure name cache.
 * @param argumentCache - The argument cache.
 */
const requestHandler = async (
	req: Request,
	res: Response,
	_next: NextFunction,
	connectionPool: Pool,
	options: configPlSqlHandlerType,
	procedureNameCache: Cache<string>,
	argumentCache: Cache<argsType>,
): Promise<void> => {
	try {
		let authenticatedUser: string | null = null;

		// authentication logic
		if (options.auth?.type === 'basic') {
			const b64auth = (req.headers.authorization ?? '').split(' ')[1] ?? '';
			const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

			if (login) {
				authenticatedUser = await options.auth.callback({username: login, password});
			}

			if (authenticatedUser === null) {
				const realm = options.auth.realm ?? 'PL/SQL Gateway';
				res.set('WWW-Authenticate', `Basic realm="${realm}"`);
				res.status(401).send('Authentication required.');
				return;
			}
		}

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
			await processRequest(req, res, options, connectionPool, procedureNameCache, argumentCache, authenticatedUser);
		}
	} catch (err) {
		errorPage(req, res, options, err);
	}
};

/**
 * Express middleware.
 *
 * @param connectionPool - The connection pool.
 * @param config - The configuration options.
 * @returns The handler.
 */
export const handlerWebPlSql = (connectionPool: Pool, config: configPlSqlHandlerType): WebPlSqlRequestHandler => {
	debug('options', config);

	const procedureNameCache = new Cache<string>();
	const argumentCache = new Cache<argsType>();

	/**
	 * @param req - The request.
	 * @param res - The response.
	 * @param next - The next function.
	 */
	const handler = (req: Request, res: Response, next: NextFunction): void => {
		void requestHandler(req, res, next, connectionPool, config, procedureNameCache, argumentCache);
	};

	// Expose caches for Admin Console
	(handler as WebPlSqlRequestHandler).procedureNameCache = procedureNameCache;
	(handler as WebPlSqlRequestHandler).argumentCache = argumentCache;

	return handler as WebPlSqlRequestHandler;
};
