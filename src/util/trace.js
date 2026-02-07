/*
 *	Trace utilities
 */

import * as rotatingFileStream from 'rotating-file-stream';
import express from 'express';
import util from 'node:util';
import oracledb from 'oracledb';
import {escapeHtml, convertAsciiToHtml} from './html.js';
import {errorToString} from './errorToString.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('../types.js').BindParameterConfig} BindParameterConfig
 * @typedef {import('../types.js').environmentType} environmentType
 * @typedef {{html: string; text: string}} outputType
 * @typedef {{type: 'error' | 'warning' | 'trace'; message: string; timestamp?: Date | null; req?: Request | null; environment?: environmentType | null, sql?: string | null; bind?: BindParameterConfig | null}} messageType
 */

const SEPARATOR_H1 = '='.repeat(100);
const SEPARATOR_H2 = '-'.repeat(30);

/**
 * Return a string representation of the value.
 *
 * @param {unknown} value - Any value.
 * @param {number | null} depth - Specifies the number of times to recurse while formatting object.
 * @returns {string} - The string representation.
 */
export const inspect = (value, depth = null) => {
	try {
		return util.inspect(value, {showHidden: false, depth, colors: false});
	} catch (err) {
		/* empty */
	}

	try {
		return JSON.stringify(value);
	} catch (err) {
		/* empty */
	}

	return 'Unable to convert value to string';
};

/**
 * Return a tabular representation of the values.
 *
 * @param {string[]} head - The header values.
 * @param {string[][]} body - The row values.
 * @returns {outputType} - The output.
 */
export const toTable = (head, body) => {
	if (head.length === 0) {
		throw new Error('head cannot be empty');
	}

	// Calculate column widths
	const widths = head.map((h, i) => {
		const bodyMax = Math.max(0, ...body.map((row) => (row[i] ?? '').length));
		return Math.max(h.length, bodyMax);
	});

	// Build text representation
	/**
	 *	@param {string} cell - The string
	 *	@param {number} width - The width
	 *	@returns {string} - The result
	 */
	const padCell = (cell, width) => cell.padEnd(width, ' ');
	const textHeader = head.map((h, i) => padCell(h, widths[i] ?? 0)).join(' | ');
	const textSeparator = widths.map((w) => '-'.repeat(w ?? 0)).join('-+-');
	const textRows = body.map((row) => head.map((_, i) => padCell(row[i] ?? '', widths[i] ?? 0)).join(' | '));
	const text = [textHeader, textSeparator, ...textRows].join('\n');

	const htmlHead = head.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
	const htmlBody = body.map((row) => `<tr>${head.map((_, i) => `<td>${escapeHtml(row[i] ?? '')}</td>`).join('')}</tr>`).join('');
	const html = `<table><thead><tr>${htmlHead}</tr></thead><tbody>${htmlBody}</tbody></table>`;

	return {text, html};
};

/**
 * Log text to the console and to a file.
 *
 * @param {string} text - Text to log.
 * @returns {void}
 */
export const logToFile = (text) => {
	const fs = rotatingFileStream.createStream('trace.log', {
		size: '10M', // rotate every 10 MegaBytes written
		interval: '1d', // rotate daily
		maxFiles: 10, // maximum number of rotated files to keep
		compress: 'gzip', // compress rotated files
	});

	fs.write(text);
	fs.end();
};

/**
 * Return a string representation of the request.
 *
 * @param {express.Request} req - express.Request.
 * @param {boolean} simple - Set to false to see all public properties of the request.
 * @returns {string} - The string representation.
 */
const inspectRequest = (req, simple = true) => {
	/** @type {Record<string, unknown>} */
	const requestData = {};

	Object.keys(req)
		.filter((prop) =>
			simple ? ['originalUrl', 'params', 'query', 'url', 'method', 'body', 'files', 'secret', 'cookies'].includes(prop) : !prop.startsWith('_'),
		)
		.forEach((prop) => {
			requestData[prop] = req[/** @type {keyof import('express').Request} */ (prop)];
		});

	return inspect(requestData);
};

/**
 *	Return a string representation of the bind parameter.
 *	@param {number | undefined} dir - The direction.
 *	@returns {string} The string.
 */
const dirToString = (dir) => {
	switch (dir) {
		case oracledb.BIND_IN:
			return 'IN';
		case oracledb.BIND_OUT:
			return 'OUT';
		case oracledb.BIND_INOUT:
			return 'INOUT';
		default:
			return '';
	}
};

/**
 *	Return a string representation of the bind type.
 *	@param {oracledb.DbType | string | number | undefined} type - The type.
 *	@returns {string} The string.
 */
const bindTypeToString = (type) => {
	if (typeof type === 'object' && 'name' in type) {
		return type.name;
	}

	if (typeof type === 'string') {
		return type;
	}

	if (typeof type === 'number') {
		return type.toString();
	}

	return '';
};

/**
 *	Return a string representation of the bind parameter.
 *	@param {outputType} output - The output.
 *	@param {BindParameterConfig} bind - The bind parameters.
 *	@returns {undefined}
 */
const inspectBindParameter = (output, bind) => {
	const rows = Object.entries(bind);

	if (rows.length === 0) {
		return;
	}

	const body = rows.map(([id, row]) => {
		const dir = dirToString(row.dir);
		const maxArraySize = row.maxArraySize ? row.maxArraySize.toString() : '';
		const maxSize = row.maxSize ? row.maxSize.toString() : '';
		const bindType = bindTypeToString(row.type);
		const value = inspect(row.val);
		const valueType = typeof row.val;

		return [id, dir, maxArraySize, maxSize, bindType, value, valueType];
	});

	const {html, text} = toTable(['id', 'dir', 'maxArraySize', 'maxSize', 'bind type', 'value', 'value type'], body);

	output.html += html;
	output.text += text;
};

/**
 * Add environment
 *	@param {outputType} output - The output.
 *	@param {environmentType} environment - The environment.
 */
const inspectEnvironment = (output, environment) => {
	const rows = Object.entries(environment);

	if (rows.length === 0) {
		return;
	}

	const {html, text} = toTable(['key', 'value'], rows);

	output.html += html;
	output.text += text;
};

/**
 *	Get a block.
 *	@param {string} title - The name.
 *	@param {string} body - The name.
 *	@returns {string} - The text.
 */
export const getBlock = (title, body) => `\n${SEPARATOR_H2}${title.toUpperCase()}${SEPARATOR_H2}\n${body}`;

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
 *	Get a formatted message.
 *	@param {messageType} para - The req object represents the HTTP request.
 *	@returns {outputType} - The output.
 */
export const getFormattedMessage = (para) => {
	const timestamp = para.timestamp ?? new Date();

	// header
	const url = typeof para.req?.originalUrl === 'string' && para.req.originalUrl.length > 0 ? ` on ${para.req.originalUrl}` : '';
	const header = `${para.type.toUpperCase()} at ${timestamp.toUTCString()}${url}`;
	const output = {
		html: `<h1>${header}</h1>`,
		text: `\n\n${SEPARATOR_H1}\n== ${header}\n${SEPARATOR_H1}\n`,
	};

	// error
	addHeader(output, 'ERROR');
	addLine(output, para.message);

	// request
	if (para.req) {
		addHeader(output, 'REQUEST');
		addLine(output, inspectRequest(para.req));
	}

	// parameters
	if (para.sql && para.bind) {
		addHeader(output, 'PROCEDURE');
		addProcedure(output, para.sql, para.bind);
	}

	// environment
	if (para.environment) {
		addHeader(output, 'ENVIRONMENT');
		inspectEnvironment(output, para.environment);
	}

	return output;
};

/**
 *	Log a warning message.
 *	@param {messageType} para - The req object represents the HTTP request.
 */
export const warningMessage = (para) => {
	const {text} = getFormattedMessage(para);

	// trace to file
	logToFile(text);

	// console
	console.warn(text);
};
