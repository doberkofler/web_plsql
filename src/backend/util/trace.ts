/*
 *	Trace utilities
 */

import * as rotatingFileStream from 'rotating-file-stream';
import type {Request} from 'express';
import util from 'node:util';
import oracledb from 'oracledb';
import {escapeHtml, convertAsciiToHtml} from './html.ts';
import {errorToString} from './errorToString.ts';
import {TRACE_LOG_ROTATION_SIZE, TRACE_LOG_ROTATION_INTERVAL, TRACE_LOG_MAX_ROTATED_FILES} from '../../common/constants.ts';
import type {environmentType} from '../types.ts';
import type {BindParameter, BindParameters} from 'oracledb';

/**
 * Type guard for BindParameter
 * @param row - The row to check
 * @returns True if row is a BindParameter
 */
const isBindParameter = (row: unknown): row is BindParameter => {
	if (typeof row !== 'object' || row === null) {
		return false;
	}
	return 'dir' in row || 'type' in row || 'val' in row || 'maxSize' in row || 'maxArraySize' in row;
};

type outputType = {
	html: string;
	text: string;
};

export type messageType = {
	type: 'error' | 'warning' | 'trace';
	message: string;
	timestamp?: Date | null;
	req?: Request | null;
	environment?: environmentType | null;
	sql?: string | null;
	bind?: BindParameters | null;
};

const SEPARATOR_H1 = '='.repeat(100);
const SEPARATOR_H2 = '-'.repeat(30);

/**
 * Return a string representation of the value.
 *
 * @param value - Any value.
 * @param depth - Specifies the number of times to recurse while formatting object.
 * @returns The string representation.
 */
export const inspect = (value: unknown, depth: number | null = null): string => {
	try {
		return util.inspect(value, {showHidden: false, depth, colors: false});
	} catch {
		/* empty */
	}

	try {
		return JSON.stringify(value);
	} catch {
		/* empty */
	}

	return 'Unable to convert value to string';
};

/**
 * Return a tabular representation of the values.
 *
 * @param head - The header values.
 * @param body - The row values.
 * @returns The output.
 */
export const toTable = (head: string[], body: string[][]): outputType => {
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
	 *	@param cell - The string
	 *	@param width - The width
	 *	@returns The result
	 */
	const padCell = (cell: string, width: number) => cell.padEnd(width, ' ');
	/**
	 *	@param i - The index
	 *	@returns The width
	 */
	const getWidth = (i: number): number => widths[i] ?? 0;
	const textHeader = head.map((h, i) => padCell(h, getWidth(i))).join(' | ');
	const textSeparator = widths.map((w) => '-'.repeat(w ?? 0)).join('-+-');
	const textRows = body.map((row) => head.map((_, i) => padCell(row[i] ?? '', getWidth(i))).join(' | '));
	const text = [textHeader, textSeparator, ...textRows].join('\n');

	const htmlHead = head.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
	const htmlBody = body.map((row) => `<tr>${head.map((_, i) => `<td>${escapeHtml(row[i] ?? '')}</td>`).join('')}</tr>`).join('');
	const html = `<table><thead><tr>${htmlHead}</tr></thead><tbody>${htmlBody}</tbody></table>`;

	return {text, html};
};

/**
 * Log text to the console and to a file.
 *
 * @param text - Text to log.
 */
export const logToFile = (text: string): void => {
	const fs = rotatingFileStream.createStream('trace.log', {
		size: TRACE_LOG_ROTATION_SIZE, // rotate every 10 MegaBytes written
		interval: TRACE_LOG_ROTATION_INTERVAL, // rotate daily
		maxFiles: TRACE_LOG_MAX_ROTATED_FILES, // maximum number of rotated files to keep
		compress: 'gzip', // compress rotated files
	});

	fs.write(text);
	fs.end();
};

/**
 * Return a string representation of the request.
 *
 * @param req - express.Request.
 * @returns The string representation.
 */
const inspectRequest = (req: Request): string => {
	const requestData: Record<string, unknown> = {};

	Object.keys(req)
		.filter((prop) => ['originalUrl', 'params', 'query', 'url', 'method', 'body', 'files', 'secret', 'cookies'].includes(prop))
		.forEach((prop) => {
			requestData[prop] = req[prop as keyof Request];
		});

	return inspect(requestData);
};

/**
 *	Return a string representation of the bind parameter.
 *	@param dir - The direction.
 *	@returns The string.
 */
const dirToString = (dir: number | undefined): string => {
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
 *	@param type - The type.
 *	@returns The string.
 */
const bindTypeToString = (type: unknown): string => {
	if (typeof type === 'object' && type !== null && 'name' in type) {
		return (type as {name: string}).name;
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
 *	@param output - The output.
 *	@param bind - The bind parameters.
 */
const inspectBindParameter = (output: outputType, bind: BindParameters): void => {
	const rows = Object.entries(bind);

	if (rows.length === 0) {
		return;
	}

	const body = rows.map(([id, row]) => {
		let dir = '';
		let maxArraySize = '';
		let maxSize = '';
		let bindType = '';
		let value = '';
		let valueType = '';

		if (isBindParameter(row)) {
			dir = dirToString(row.dir);
			maxArraySize = row.maxArraySize ? row.maxArraySize.toString() : '';
			maxSize = row.maxSize ? row.maxSize.toString() : '';
			bindType = bindTypeToString(row.type);
			value = inspect(row.val);
			valueType = typeof row.val;
		} else {
			value = inspect(row);
			valueType = typeof row;
		}

		return [id, dir, maxArraySize, maxSize, bindType, value, valueType];
	});

	const {html, text} = toTable(['id', 'dir', 'maxArraySize', 'maxSize', 'bind type', 'value', 'value type'], body);

	output.html += html;
	output.text += text;
};

/**
 * Add environment
 *	@param output - The output.
 *	@param environment - The environment.
 */
const inspectEnvironment = (output: outputType, environment: environmentType): void => {
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
 *	@param title - The name.
 *	@param body - The name.
 *	@returns The text.
 */
export const getBlock = (title: string, body: string): string => `\n${SEPARATOR_H2}${title.toUpperCase()}${SEPARATOR_H2}\n${body}`;

/**
 *	Get line html
 *	@param text - The text.
 *	@returns The line.
 */
const getLineHtml = (text: string): string => `<p>${convertAsciiToHtml(text)}</p>`;

/**
 *	Get line text
 *	@param text - The text.
 *	@returns The line.
 */
const getLineText = (text: string): string => `${text}\n`;

/**
 *	Add line
 *	@param output - The output.
 *	@param text - The text to convert.
 */
const addLine = (output: outputType, text: string): void => {
	output.html += getLineHtml(text);
	output.text += getLineText(text);
};

/**
 *	Add header
 *	@param output - The output.
 *	@param text - The text to convert.
 */
const addHeader = (output: outputType, text: string): void => {
	output.html += `<h2>${text}</h2>`;
	output.text += `\n${text}\n${'-'.repeat(text.length)}\n`;
};

/**
 *	Add procedure
 *	@param output - The output.
 *	@param sql - The SQL to execute.
 *	@param bind - The bind parameters.
 */
const addProcedure = (output: outputType, sql: string, bind: BindParameters): void => {
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
 *	@param para - The req object represents the HTTP request.
 *	@returns The output.
 */
export const getFormattedMessage = (para: messageType): outputType => {
	const timestamp = para.timestamp ?? new Date();

	// header
	const url = typeof para.req?.originalUrl === 'string' && para.req.originalUrl.length > 0 ? ` on ${para.req.originalUrl}` : '';
	const type = (para.type ?? 'trace').toUpperCase();
	const header = `${type} at ${timestamp.toUTCString()}${url}`;
	const output: outputType = {
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
 *	@param para - The req object represents the HTTP request.
 */
export const warningMessage = (para: messageType): void => {
	const {text} = getFormattedMessage(para);

	// trace to file
	logToFile(text);

	// console
	console.warn(text);
};
