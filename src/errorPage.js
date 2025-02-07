/*
 *	Error handling
 */

import util from 'node:util';
import escape from 'escape-html';
import {ProcedureError} from './procedureError.js';
import {RequestError} from './requestError.js';
import {inspectRequest, logToFile} from './trace.js';
import {errorToString} from './error.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('./types.js').BindParameterConfig} BindParameterConfig
 * @typedef {import('./types.js').environmentType} environmentType
 * @typedef {import('./types.js').configPlSqlHandlerType} configPlSqlHandlerType
 * @typedef {{html: string; text: string}} outputType
 */

/**
 *	Convert value to string
 *	@param {unknown} value - The value to convert.
 *	@returns {string} - The string representation of the value.
 */
const inspect = (value) => util.inspect(value, {showHidden: false, depth: null, colors: false});

/**
 *	Convert LF and/or CR to <br>
 *	@param {string} text - The text to convert.
 *	@returns {string} - The converted text.
 */
const convertToHtml = (text) => {
	let html = escape(text);

	html = html.replace(/(?:\r\n|\r|\n)/g, '<br />');
	html = html.replace(/\t/g, '&nbsp;&nbsp;&nbsp;');

	return html;
};

/**
 *	Get html
 *	@param {string} text - The text to convert.
 *	@returns {string} - The converted text.
 */
const getHtml = (text) => `<p>${convertToHtml(text)}</p>`;

/**
 *	Get text header
 *	@param {string} text - The text to convert.
 *	@returns {string} - The converted text.
 */
const getHeaderText = (text) => `\n${text}\n${'='.repeat(text.length)}\n`;

/**
 *	Get html header
 *	@param {string} text - The text to convert.
 *	@returns {string} - The converted text.
 */
const getHeaderHtml = (text) => `<h1>${text}</h1>`;

/**
 *	Get text
 *	@param {string} text - The text to convert.
 *	@returns {string} - The converted text.
 */
const getText = (text) => `${text}\n`;

/**
 * Get evnironment
 *	@param {outputType} output - The output.
 *	@param {environmentType} environment - The environment.
 */
const getEnvironment = (output, environment) => {
	let html = '<table>';
	let text = '';

	try {
		for (const key in environment) {
			html += `<tr><td>${key}:</td><td>${environment[key]}</td></tr>`;
			text += `${key}=${environment[key]}\n`;
		}
	} catch (err) {
		/* istanbul ignore next */
		output.html += errorToString(err);

		/* istanbul ignore next */
		output.text += errorToString(err);

		/* istanbul ignore next */
		return;
	}

	html += '</table>';

	output.html += html;
	output.text += text;
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

	/** @type {outputType} */
	const output = {
		html: '',
		text: '',
	};

	// timestamp
	let header = 'TIMESTAMP';
	output.html += getHeaderHtml(header);
	output.html += getHtml(timestamp.toUTCString());

	// error
	header = 'ERROR';
	output.html += getHeaderHtml(header);
	output.html += getHtml(message);
	output.text += getHeaderText(header);
	output.text += getText(message);

	// request
	header = 'REQUEST';
	output.text += getHeaderText(header);
	output.text += getText(inspectRequest(req));

	// parameters
	if (typeof sql === 'string' && bind) {
		header = 'PROCEDURE';
		output.html += getHeaderHtml(header);
		output.text += getHeaderText(header);
		getProcedure(output, sql, bind);
	}

	// environment
	if (environment) {
		header = 'ENVIRONMENT';
		output.html += getHeaderHtml(header);
		output.text += getHeaderText(header);
		getEnvironment(output, environment);
	}

	return output;
};

/**
 *	Get procedure
 *	@param {outputType} output - The output.
 *	@param {string} sql - The SQL to execute.
 *	@param {BindParameterConfig} bind - The bind parameters.
 */
const getProcedure = (output, sql, bind) => {
	let html = '<table>';
	let text = '';

	text += `PROCEDURE: ${sql}\n`;
	html += `<tr><td>PROCEDURE:</td><td>${sql}</td></tr>`;

	try {
		/* istanbul ignore else */
		for (const key in bind) {
			const value = inspect(bind[key].val);

			html += `<tr><td>${key}:</td><td>${value}</td></tr>`;
			text += `${key}: ${value}\n`;
		}
	} catch (err) {
		/* istanbul ignore next */
		output.html += err instanceof Error ? err.toString() : 'ERROR';

		/* istanbul ignore next */
		output.text += err instanceof Error ? err.toString() : 'ERROR';
		/* istanbul ignore next */
		return;
	}

	html += '</table>';

	output.html += html;
	output.text += text;
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
	let output = {
		html: '',
		text: '',
	};

	// get the error description
	try {
		output = getError(req, error);
	} catch (err) {
		/* istanbul ignore next */
		const header = 'ERROR';

		/* istanbul ignore next */
		const message = errorToString(err);

		/* istanbul ignore next */
		output.html += getHeaderHtml(header) + getHtml(message);

		/* istanbul ignore next */
		output.text += getHeaderHtml(header) + getHtml(message);
	}

	// trace to file
	logToFile(output.text);

	// console
	console.error(output.text);

	// show page
	if (options.errorStyle === 'basic') {
		res.status(404).send('Page not found');
	} else {
		res.status(404).send(getHtmlPage(output.html));
	}
};
