/*
 *	Error handling
 */

import {ProcedureError} from './procedureError.ts';
import {RequestError} from './requestError.ts';
import {getFormattedMessage, logToFile, type messageType} from '../../util/trace.ts';
import {errorToString} from '../../util/errorToString.ts';
import {getHtmlPage} from '../../util/html.ts';
import {jsonLogger} from '../../util/jsonLogger.ts';
import type {Request, Response} from 'express';
import type {BindParameterConfig, environmentType, configPlSqlHandlerType} from '../../types.ts';

/**
 *	Get error data
 *	@param req - The req object represents the HTTP request.
 *	@param error - The error.
 *	@returns The output.
 */
const getErrorData = (req: Request, error: unknown): messageType => {
	let timestamp = new Date();
	let message = '';
	let environment: environmentType | null | undefined = null;
	let sql: string | null | undefined = null;
	let bind: BindParameterConfig | null | undefined = null;

	// what type of Error did we receive
	if (error instanceof ProcedureError) {
		timestamp = error.timestamp;
		message = error.stack ?? '';
		environment = error.environment;
		sql = error.sql;
		bind = error.bind;
	} else if (error instanceof RequestError) {
		timestamp = error.timestamp;
		message = error.stack ?? '';
	} else if (error instanceof Error) {
		message = errorToString(error);
	} else {
		if (typeof error === 'string') {
			message = `${error}\n`;
		}
		/* v8 ignore start - unreachable code: creating Error without throwing */
		try {
			new Error();
		} catch (err) {
			message += errorToString(err);
		}
		/* v8 ignore stop */
	}

	return {type: 'error', timestamp, message, req, environment, sql, bind};
};

/**
 * Show an error page
 *
 * @param req - The req object represents the HTTP request.
 * @param res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param options - The configuration options.
 * @param error - The error.
 */
export const errorPage = (req: Request, res: Response, options: configPlSqlHandlerType, error: unknown): void => {
	// get error data
	const errorData = getErrorData(req, error);

	// get formatted message
	const {html, text} = getFormattedMessage(errorData);

	// trace to file
	logToFile(text);

	// json log
	const firstLine = errorData.message.split('\n')[0];
	jsonLogger.log({
		timestamp: errorData.timestamp?.toISOString() ?? new Date().toISOString(),
		type: 'error',
		message: firstLine ?? '',
		req: {
			method: req.method,
			url: req.originalUrl,
			ip: req.ip ?? '',
			userAgent: req.get('user-agent') ?? '',
		},
		details: {
			fullMessage: errorData.message,
			sql: errorData.sql,
			bind: errorData.bind,
			environment: errorData.environment,
		},
	});

	// console
	console.error(text);

	// show page
	if (options.errorStyle === 'basic') {
		res.status(404).send('Page not found');
	} else {
		res.status(404).send(getHtmlPage(html));
	}
};
