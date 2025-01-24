/*
 *	Trace utilities
 */

import util from 'node:util';
import * as rotatingFileStream from 'rotating-file-stream';
import express from 'express';

const SEPARATOR_LINE = '*'.repeat(132);

/**
 * Log text to the console and to a file.
 *
 * @param {string} text - Text to log.
 * @returns {void}
 */
const logToFile = (text) => {
	const fs = rotatingFileStream.createStream('console.log', {
		size: '10M', // rotate every 10 MegaBytes written
		interval: '1d', // rotate daily
		maxFiles: 10, // maximum number of rotated files to keep
		compress: 'gzip', // compress rotated files
	});

	fs.write(text);
	fs.end();
};

export class Trace {
	/**
	 * Instantiate a new trace object.
	 *
	 * @param {'on' | 'off'} trace - Tracing.
	 */
	constructor(trace) {
		/** @type {boolean} */
		this._enabled = trace !== 'off';

		// istanbul ignore if
		if (!this._enabled) {
			return;
		}
	}

	/**
	 * Start a new trace session for a new request.
	 * This adds a trace line to the trace.log file and creating a new request trace file.
	 *
	 * @param {express.Request} req - The req object represents the HTTP request.
	 */
	start(req) {
		// istanbul ignore if
		if (!this._enabled) {
			return;
		}

		// append to the trace index
		logToFile(`${getTimestamp()} - ${req.originalUrl}\n`);

		// write the initial request information
		this.append(`${SEPARATOR_LINE}${getSection('TIMESTAMP', getTimestamp())}${getSection('REQUEST', Trace.inspectRequest(req))}${SEPARATOR_LINE}\n`);
	}

	/**
	 * Write new message to the trace file.
	 *
	 * @param {string} text - Text to append.
	 */
	write(text) {
		// istanbul ignore else
		if (this._enabled) {
			this.append(`${getTimestamp()}:\n${trimRight(text)}\n${SEPARATOR_LINE}\n`);
		}
	}

	/**
	 * Append text to the trace file.
	 *
	 * @param {string} text - Text to append.
	 */
	append(text) {
		// istanbul ignore else
		if (this._enabled) {
			logToFile(text);
		}
	}

	/**
	 * Return a string representation of the value.
	 *
	 * @param {unknown} value - Any value.
	 * @returns {string} - The string representation.
	 */
	static inspect(value) {
		return util.inspect(value, {showHidden: false, depth: null, colors: false});
	}

	/**
	 * Return a string representation of the request.
	 *
	 * @param {express.Request} req - express.Request.
	 * @param {boolean} simple - Set to false to see all public properties of the request.
	 * @returns {string} - The string representation.
	 */
	static inspectRequest(req, simple = true) {
		/** @type {Record<string, unknown>} */
		const requestData = {};

		Object.keys(req)
			.filter((prop) =>
				simple ? ['originalUrl', 'params', 'query', 'url', 'method', 'body', 'files', 'secret', 'cookies'].includes(prop) : !prop.startsWith('_'),
			)
			.forEach((prop) => {
				requestData[prop] = req[/** @type {keyof import('express').Request} */ (prop)];
			});

		return util.inspect(requestData, {showHidden: false, depth: null, colors: false});
	}
}

/**
 *	Get a section of a trace message
 *	@param {string} section - Trace file name.
 *	@param {string} text - Text to append.
 *	@returns {string} - The section.
 */
function getSection(section, text) {
	return `\n${section}\n${'='.repeat(section.length)}\n${text}\n`;
}

/**
 *	Get a timestamp
 *	@returns {string} - The timestamp.
 */
function getTimestamp() {
	return new Date().toISOString();
}

/**
 *	trim any cr/lf at the end of the string
 *	@param {string} text - Text to trim.
 *	@returns {string} - The trimmed text.
 */
function trimRight(text) {
	let s = text;

	while (s[s.length] === '\n' || s[s.length] === '\r') {
		// istanbul ignore next
		s = s.slice(0, -1);
	}

	return s;
}
