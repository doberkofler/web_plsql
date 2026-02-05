/*
 *	Error handling
 */

import {ProcedureError} from './procedureError.js';
import {RequestError} from './requestError.js';
import {getFormattedMessage, logToFile} from '../../util/trace.js';
import {errorToString} from '../../util/errorToString.js';
import {getHtmlPage} from '../../util/html.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('../../types.js').BindParameterConfig} BindParameterConfig
 * @typedef {import('../../types.js').environmentType} environmentType
 * @typedef {import('../../types.js').configPlSqlHandlerType} configPlSqlHandlerType
 * @typedef {{html: string; text: string}} outputType
 */

/**
 *	Show an error page
 *	@param {Request} req - The req object represents the HTTP request.
 *	@param {unknown} error - The error.
 *	@returns {outputType} - The output.
 */
const getError = (req, error) => {
	let timestamp = new Date();
	let message = '';
	/** @type {environmentType | null} */
	let environment = null;
	/** @type {string | null} */
	let sql = null;
	/** @type {BindParameterConfig | null} */
	let bind = null;

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

	return getFormattedMessage({type: 'error', timestamp, message, req, environment, sql, bind});
};

/**
 * Show an error page
 *
 * @param {Request} req - The req object represents the HTTP request.
 * @param {Response} res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 * @param {configPlSqlHandlerType} options - The configuration options.
 * @param {unknown} error - The error.
 */
export const errorPage = (req, res, options, error) => {
	// get error message
	const {html, text} = getError(req, error);

	// trace to file
	logToFile(text);

	// console
	console.error(text);

	// show page
	if (options.errorStyle === 'basic') {
		res.status(404).send('Page not found');
	} else {
		res.status(404).send(getHtmlPage(html));
	}
};
