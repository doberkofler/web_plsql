/*
 *	Process the http request
 */

import debugModule from 'debug';
const debug = debugModule('webplsql:request');

import util from 'node:util';
import {invokeProcedure} from './procedure.ts';
import {getCGI} from './cgi.ts';
import {getFiles} from './upload.ts';
import {RequestError} from './requestError.ts';
import {isStringOrArrayOfString} from '../../util/type.ts';
import type {Request, Response} from 'express';
import type {Pool} from '../../util/db.ts';
import type {argObjType, configPlSqlHandlerType, ProcedureNameCache, ArgumentCache} from '../../types.ts';

/**
 *	Normalize the body by making sure that only "simple" parameters and no nested objects are submitted
 *	@param req - The req object represents the HTTP request.
 *	@returns The normalized body.
 */
const normalizeBody = (req: Request): Record<string, string | string[]> => {
	const args: Record<string, string | string[]> = {};

	/* v8 ignore else - body validation */
	if (typeof req.body === 'object' && req.body !== null) {
		const body = req.body as Record<string, unknown>;
		for (const key in body) {
			const value = body[key];
			/* v8 ignore else - type validation */
			if (isStringOrArrayOfString(value)) {
				args[key] = value;
			} else {
				/* v8 ignore next - invalid body type */
				throw new RequestError(
					`The element "${key}" in the body is not a string or an array of strings!\n${util.inspect(req.body, {showHidden: false, depth: null, colors: false})}`,
				);
			}
		}
	}

	return args;
};

/**
 * Execute the request
 *
 * @param req - The req object represents the HTTP request.
 * @param res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param options - the options for the middleware.
 * @param connectionPool - The connection pool.
 * @param procedureNameCache - The procedure name cache.
 * @param argumentCache - The argument cache.
 * @returns Promise resolving to th page
 */
export const processRequest = async (
	req: Request,
	res: Response,
	options: configPlSqlHandlerType,
	connectionPool: Pool,
	procedureNameCache: ProcedureNameCache,
	argumentCache: ArgumentCache,
): Promise<void> => {
	debug('processRequest: ENTER');

	if (typeof req.params.name !== 'string') {
		// FIXME: this should be standartized
		console.warn(`processRequest: WARNING: the req.params.name is not a string but an array of string: ${req.params.name}`);
	}

	// open database connection
	const connection = await connectionPool.getConnection();

	// Get the CGI
	const cgiObj = getCGI(req, options.documentTable, options.cgi ?? {});
	debug('processRequest: cgiObj=', cgiObj);

	// Does the request contain any files
	const filesToUpload = getFiles(req);
	debug('processRequest: filesToUpload=', filesToUpload);

	// Add the query properties
	const argObj: argObjType = {};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	Object.assign(argObj, req.query as any);

	// For add the files that must be uploaded, we now copy the actual filename to the appropriate parameter to the invoked procedure.
	filesToUpload.reduce((aggregator, file) => {
		aggregator[file.fieldname] = file.filename;
		return aggregator;
	}, argObj);

	// Does the request contain a body
	Object.assign(argObj, normalizeBody(req));
	debug('processRequest: argObj=', argObj);

	// invoke the Oracle procedure and get the page contenst
	await invokeProcedure(req, res, argObj, cgiObj, filesToUpload, options, connection, procedureNameCache, argumentCache);

	// transaction mode
	if (options.transactionMode === 'rollback') {
		debug('transactionMode: rollback');
		await connection.rollback();
	} else if (typeof options.transactionMode === 'function') {
		debug('transactionMode: callback');
		const procName = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
		const result = options.transactionMode(connection, procName ?? '');
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
