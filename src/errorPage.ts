/*
*	Error handling
*/

import util from 'util';
import escape from 'escape-html';
import {ProcedureError} from './procedureError';
import {RequestError} from './requestError';
import express from 'express';
import {Trace} from './trace';
import {oracleExpressMiddleware$options} from './config';
import {environmentType} from './cgi';
type outputType = {html: string; text: string};

/**
* Show an error page
*
* @param {express.Request} req - The req object represents the HTTP request.
* @param {express.Response} res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
* @param {Object} options - The configuration options.
* @param {Trace} trace - Tracing object.
* @param {Error} error - The error.
*/
export function errorPage(req: express.Request, res: express.Response, options: oracleExpressMiddleware$options, trace: Trace, error: unknown): void {
	let output = {
		html: '',
		text: ''
	};

	// get the error description
	try {
		output = getError(req, error);
	} catch (err) {
		/* istanbul ignore next */
		const header = 'ERROR';

		/* istanbul ignore next */
		const message = err instanceof Error ? `${err.message}\n${err.stack}` : JSON.stringify(err);

		/* istanbul ignore next */
		output.html += getHeaderHtml(header) + getHtml(message);

		/* istanbul ignore next */
		output.text += getHeaderHtml(header) + getHtml(message);
	}

	// trace to file
	trace.write(output.text);

	// console
	console.error(output.text);

	// show page
	if (options.errorStyle === 'basic') {
		res.status(404).send('Page not found');
	} else {
		res.status(404).send(getHtmlPage(output.html));
	}
}

/*
* Show an error page
*/
function getError(req: express.Request, error: unknown): outputType {
	let timestamp: Date = new Date();
	let message: string = '';
	let environment: environmentType | null = null;
	let sql: string | null = null;
	let bind: any | null = null;

	// what type of Error did we receive
	if (error instanceof ProcedureError) {
		timestamp = error.timestamp;
		/* istanbul ignore next */
		message = error.stack || '';
		environment = error.environment;
		sql = error.sql;
		bind = error.bind;
	} else if (error instanceof RequestError) {
		timestamp = error.timestamp;
		/* istanbul ignore next */
		message = error.stack || '';
	} else if (error instanceof Error) {
		/* istanbul ignore next */
		message = error.stack || '';
	} else {
		if (typeof error === 'string') {
			/* istanbul ignore next */
			message = `${error}\n`;
		}
		try {
			/* istanbul ignore next */
			new Error(); // eslint-disable-line no-new
		} catch (err) {
			/* istanbul ignore next */
			message += err instanceof Error ? err.stack : '';
		}
	}

	const output: outputType = {
		html: '',
		text: ''
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
	output.text += getText(Trace.inspectRequest(req));

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
}

/*
* get procedure
*/
function getProcedure(output: outputType, sql: string, bind: any) {
	let html = '<table>';
	let text = '';

	text += `PROCEDURE: ${sql}\n`;
	html += `<tr><td>PROCEDURE:</td><td>${sql}</td></tr>`;

	try {
		/* istanbul ignore else */
		if (sql.indexOf('(:argnames, :argvalues)') < 0) {
			for (const key in bind) {
				const value = inspect(bind[key].val);

				html += `<tr><td>${key}:</td><td>${value}</td></tr>`;
				text += `${key}: ${value}\n`;
			}
		} else {
			bind.argnames.val.forEach((name: string, index: number) => {
				const value = inspect(bind.argvalues.val[index]);

				html += `<tr><td>${name}:</td><td>${value}</td></tr>`;
				text += `${name}: ${value}\n`;
			});
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
}

/*
* get evnironment
*/
function getEnvironment(output: outputType, environment: environmentType) {
	let html = '<table>';
	let text = '';

	try {
		for (const key in environment) {
			html += `<tr><td>${key}:</td><td>${environment[key]}</td></tr>`;
			text += `${key}=${environment[key]}\n`;
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
}

/*
*	get text header
*/
function getHeaderText(text: string): string {
	return `\n${text}\n${'='.repeat(text.length)}\n`;
}

/*
*	get html header
*/
function getHeaderHtml(text: string): string {
	return `<h1>${text}</h1>`;
}

/*
*	get text
*/
function getText(text: string): string {
	return `${text}\n`;
}

/*
*	get html
*/
function getHtml(text: string): string {
	return `<p>${convertToHtml(text)}</p>`;
}

/*
*	convert value to string
*/
function inspect(value: any): string {
	return util.inspect(value, {showHidden: false, depth: null, colors: false});
}

/*
*	convert LF and/or CR to <br>
*/
function convertToHtml(text: string): string {
	let html = escape(text);

	html = html.replace(/(?:\r\n|\r|\n)/g, '<br />');
	html = html.replace(/\t/g, '&nbsp;&nbsp;&nbsp;');

	return html;
}

/*
*	getHtmlPage
*/
function getHtmlPage(body: string): string {
	return `<!DOCTYPE html>
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
` + body + `
</body>
</html>
`;
}
