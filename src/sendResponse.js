/*
 *	Page the raw page content and return the content to the client
 */

import debugModule from 'debug';
const debug = debugModule('webplsql:sendResponse');

import {getBlock} from './trace.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('./types.js').pageType} pageType
 */

/**
 *	Send "default" response to the browser
 *	@param {Request} req - The req object represents the HTTP request.
 *	@param {Response} res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 *	@param {pageType} page - The page to send.
 *	@returns {void}
 */
export const sendResponse = (req, res, page) => {
	/** @type {string[]} */
	const debugText = [];

	// Send the "cookies"
	page.head.cookies.forEach((cookie) => {
		const {name, value} = cookie;

		if (debug.enabled) {
			debugText.push(`res.cookie("${name}", "${value}")`);
		}

		res.cookie(name, value);
	});

	// If there is a "redirectLocation" header, we immediately redirect and return
	if (typeof page.head.redirectLocation === 'string' && page.head.redirectLocation.length > 0) {
		if (debug.enabled) {
			debugText.push(`res.redirect(302, "${page.head.redirectLocation}")`);
			debug(getBlock('RESPONSE', debugText.join('\n')));
		}

		res.redirect(302, page.head.redirectLocation);
		return;
	}

	// Send all the "otherHeaders"
	for (const key in page.head.otherHeaders) {
		if (debug.enabled) {
			debugText.push(`res.set("${key}", "${page.head.otherHeaders[key]}")`);
		}

		res.set(key, page.head.otherHeaders[key]);
	}

	// If this is a file download, we eventually set the "Content-Type" and the file content and then return.
	if (page.file.fileType === 'B' || page.file.fileType === 'F') {
		if (typeof page.head.contentType === 'string' && page.head.contentType.length > 0) {
			if (debug.enabled) {
				debugText.push(`res.writeHead("Content-Type", "${page.head.contentType}")`);
			}

			res.writeHead(200, {'Content-Type': page.head.contentType});
		}

		if (debug.enabled) {
			debugText.push(`res.end("${page.file.fileType}")`);
			debug(getBlock('RESPONSE', debugText.join('\n')));
		}

		res.end(page.file.fileBlob, 'binary');
		return;
	}

	// Is the a "contentType" header
	if (typeof page.head.contentType === 'string' && page.head.contentType.length > 0) {
		if (debug.enabled) {
			debugText.push(`res.set("Content-Type", "${page.head.contentType}")`);
		}

		res.set('Content-Type', page.head.contentType);
	}

	// If we have a "Status" header, we send the header and then return.
	if (typeof page.head.statusCode === 'number') {
		if (debug.enabled) {
			debugText.push(`res.status(page.head.statusCode).send("${page.head.statusDescription}")`);
			debug(getBlock('RESPONSE', debugText.join('\n')));
		}

		res.status(page.head.statusCode).send(page.head.statusDescription);
		return;
	}

	// Send the body
	if (debug.enabled) {
		debugText.push(`${'-'.repeat(60)}\n${page.body}`);
		debug(getBlock('RESPONSE', debugText.join('\n')));
	}

	res.send(page.body);
};
