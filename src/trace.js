/*
 *	Trace utilities
 */

import util from 'node:util';
import * as rotatingFileStream from 'rotating-file-stream';
import express from 'express';

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
 * Return a string representation of the value.
 *
 * @param {unknown} value - Any value.
 * @returns {string} - The string representation.
 */
export const inspect = (value) => util.inspect(value, {showHidden: false, depth: null, colors: false});

/**
 * Return a string representation of the request.
 *
 * @param {express.Request} req - express.Request.
 * @param {boolean} simple - Set to false to see all public properties of the request.
 * @returns {string} - The string representation.
 */
export const inspectRequest = (req, simple = true) => {
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
 *	Get a separator line.
 *	@param {number} [size] - The size.
 *	@returns {string} - The separator.
 */
export const getSeparator = (size = 30) => '*'.repeat(size);

/**
 *	Get a section.
 *	@param {string} name - The name.
 *	@returns {string} - The section.
 */
export const getSection = (name) => `${name}\n${'='.repeat(name.length)}`;

/**
 *	Get a timestamp
 *	@returns {string} - The timestamp.
 */
export const getTimestamp = () => new Date().toISOString();
