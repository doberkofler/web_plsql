// @flow

/*
*	Error handling
*/

const debug = require('debug')('web_plsql:errorPage');
const util = require('util');
const ProcedureError = require('./procedureError');
const RequestError = require('./requestError');
const trace = require('./trace');

import type {oracleExpressMiddleware$options} from './config';
import type {environmentType} from './cgi';
type outputType = {html: string, text: string};

/**
* Show an error page
*
* @param {$Request} req - The req object represents the HTTP request.
* @param {$Response} res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
* @param {Object} options - The configuration options.
* @param {Error} error - The error.
*/
module.exports = function errorPage(req: $Request, res: $Response, options: oracleExpressMiddleware$options, error: Error): void {
	let output = {
		html: '',
		text: ''
	};

	// get the error description
	try {
		output = getError(req, error);
	} catch (e) {
		getHeader(output, 'TIMESTAMP');
		getText(output, (new Date()).toUTCString());

		getHeader(output, 'ERROR');
		getText(output, `${e.message}\n${e.stack}`);
	}

	// trace to file
	trace.trace(output.text);

	// debug
	debug(output.text);

	// show page
	res.status(404).send(getHtmlPage(output.html));
};

/*
* Show an error page
*/
function getError(req: $Request, error: Error): outputType {
	let timestamp: Date = new Date();
	let message: string = '';
	let environment: environmentType | null = null;
	let sql: string | null = null;
	let bind: oracledb$bindingType | null = null;

	// what type of Error did we receive
	if (error instanceof ProcedureError) {
		timestamp = error.timestamp;
		message = error.message;
		environment = error.environment;
		sql = error.sql;
		bind = error.bind;
	} else if (error instanceof RequestError) {
		timestamp = error.timestamp;
		message = error.message;
	} else if (error instanceof Error) {
		message = error.message;
	}

	const output: outputType = {
		html: '',
		text: ''
	};

	// timestamp
	getHeader(output, 'TIMESTAMP');
	getText(output, timestamp.toUTCString());

	// error
	getHeader(output, 'ERROR');
	getText(output, message);

	// request
	getHeader(output, 'REQUEST');
	getPre(output, trace.reqToString(req));

	// parameters
	if (typeof sql === 'string' && bind) {
		getProcedure(output, sql, bind);
	}

	// environment
	if (environment) {
		getEnvironment(output, environment);
	}

	return output;
}

/*
* get procedure
*/
function getProcedure(output: outputType, sql: string, bind: oracledb$bindingType) {
	getHeader(output, 'PROCEDURE');

	let html = '<table>';
	let text = '';

	text += 'PROCEDURE: ' + sql;
	html += `<tr><td>PROCEDURE:</td><td>${sql}</td></tr>`;

	try {
		if (sql.indexOf('(:argnames, :argvalues)') < 0) {
			for (const key in bind) {
				// $FlowFixMe
				const value = inspect(bind[key].val);

				html += `<tr><td>${key}:</td><td>${value}</td></tr>`;
				text += key + ': ' + value + '\n';
			}
		} else {
			// $FlowFixMe
			bind.argnames.val.forEach((name, index) => {
				// $FlowFixMe
				const value = inspect(bind.argvalues.val[index]);

				html += `<tr><td>${name}:</td><td>${value}</td></tr>`;
				text += name + ': ' + value + '\n';
			});
		}
	} catch (e) {
		output.html += e.toString();
		output.text += e.toString();
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
	getHeader(output, 'ENVIRONMENT');

	let html = '<table>';
	let text = '';

	try {
		for (const key in environment) {
			html += `<tr><td>${key}:</td><td>${environment[key]}</td></tr>`;
			text += key + '=' + environment[key] + '\n';
		}
	} catch (e) {
		output.html += e.toString();
		output.text += e.toString();
		return;
	}

	html += '</table>';

	output.html += html;
	output.text += text;
}

/*
*	get header
*/
function getHeader(output: outputType, text: string) {
	output.text += '\n' + text + '\n' + '='.repeat(text.length) + '\n';
	output.html += `<h1>${text}</h1>`;
}

/*
*	get text
*/
function getText(output: outputType, text: string) {
	output.text += text + '\n';
	output.html += `<p>${convertToHtml(text)}</p>`;
}

/*
*	get pre
*/
function getPre(output: outputType, text: string) {
	output.text += text + '\n';
	output.html += `<pre>${text}</pre>`;
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
	let html = text;

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
