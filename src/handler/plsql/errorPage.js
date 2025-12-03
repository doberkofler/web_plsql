/*
 *	Error handling
 */

import {ProcedureError} from './procedureError.js';
import {RequestError} from './requestError.js';
import {inspectRequest, inspectBindParameter, inspectEnvironment, logToFile} from '../../util/trace.js';
import {errorToString} from '../../util/errorToString.js';
import {convertAsciiToHtml} from '../../util/html.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('../../types.js').BindParameterConfig} BindParameterConfig
 * @typedef {import('../../types.js').environmentType} environmentType
 * @typedef {import('../../types.js').configPlSqlHandlerType} configPlSqlHandlerType
 * @typedef {{html: string; text: string}} outputType
 */

const separator = '='.repeat(100);
let errorCount = 0;

/**
 *	Get line html
 *	@param {string} text - The text.
 *	@returns {string} - The line.
 */
const getLineHtml = (text) => `<p>${convertAsciiToHtml(text)}</p>`;

/**
 *	Get line text
 *	@param {string} text - The text.
 *	@returns {string} - The line.
 */
const getLineText = (text) => `${text}\n`;

/**
 *	Add line
 *	@param {outputType} output - The output.
 *	@param {string} text - The text to convert.
 */
const addLine = (output, text) => {
	output.html += getLineHtml(text);
	output.text += getLineText(text);
};

/**
 *	Add header
 *	@param {outputType} output - The output.
 *	@param {string} text - The text to convert.
 */
const addHeader = (output, text) => {
	output.html += `<h2>${text}</h2>`;
	output.text += `\n${text}\n${'-'.repeat(text.length)}\n`;
};

/**
 *	Add procedure
 *	@param {outputType} output - The output.
 *	@param {string} sql - The SQL to execute.
 *	@param {BindParameterConfig} bind - The bind parameters.
 */
const addProcedure = (output, sql, bind) => {
	output.html += `${sql}<br><br>`;
	output.text += `${sql}\n\n`;

	try {
		inspectBindParameter(output, bind);
	} catch (err) {
		addLine(output, `Unable to inspect bind parameter: ${errorToString(err)}`);
	}

	output.html += `<br>`;
	output.text += `\n`;
};

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
	/** @type {BindParameterConfig} */
	let bind = {};

	// what type of Error did we receive
	if (error instanceof ProcedureError) {
		timestamp = error.timestamp;
		/* istanbul ignore next */
		message = error.stack ?? '';
		environment = error.environment;
		sql = error.sql;
		bind = error.bind;
	} else if (error instanceof RequestError) {
		timestamp = error.timestamp;
		/* istanbul ignore next */
		message = error.stack ?? '';
	} else if (error instanceof Error) {
		/* istanbul ignore next */
		message = errorToString(error);
	} else {
		if (typeof error === 'string') {
			/* istanbul ignore next */
			message = `${error}\n`;
		}
		try {
			/* istanbul ignore next */
			new Error();
		} catch (err) {
			/* istanbul ignore next */
			message += errorToString(err);
		}
	}

	errorCount++;
	const url = typeof req.originalUrl === 'string' && req.originalUrl.length > 0 ? ` on ${req.originalUrl}` : '';
	const header = `ERROR #${errorCount} at ${timestamp.toUTCString()}${url}`;
	const output = {
		html: `<h1>${header}</h1>`,
		text: `\n\n${separator}\n== ${header}\n${separator}\n`,
	};

	// error
	addHeader(output, 'ERROR');
	addLine(output, message);

	// request
	addHeader(output, 'REQUEST');
	addLine(output, inspectRequest(req));

	// parameters
	if (typeof sql === 'string' && bind) {
		addHeader(output, 'PROCEDURE');
		addProcedure(output, sql, bind);
	}

	// environment
	if (environment) {
		addHeader(output, 'ENVIRONMENT');
		inspectEnvironment(output, environment);
	}

	return output;
};

/**
 *	getHtmlPage
 *	@param {string} body - The body.
 *	@returns {string} - The html page.
 */
const getHtmlPage = (body) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>web_plsql error page</title>
<style type="text/css">
html {
	font-family: monospace, sans-serif;
	font-size: 12px;
}
h1 {
	font-size: 16px;
	padding: 2px;
	background-color: #cc0000;
}
</style>
</head>
<body>
${body}
</body>
</html>
`;

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
