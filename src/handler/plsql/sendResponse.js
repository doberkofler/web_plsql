/*
 *	Page the raw page content and return the content to the client
 */

import debugModule from 'debug';
const debug = debugModule('webplsql:sendResponse');

import stream from 'node:stream';
import {getBlock} from '../../util/trace.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').CookieOptions} CookieOptions
 * @typedef {import('../../types.js').pageType} pageType
 * @typedef {import('../../types.js').cookieType} cookieType
 */

/**
 *	Send "default" response to the browser
 *	@param {Request} _req - The req object represents the HTTP request.
 *	@param {Response} res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 *	@param {pageType} page - The page to send.
 *	@returns {Promise<void>}
 */
export const sendResponse = async (_req, res, page) => {
	/** @type {string[]} */
	const debugText = [];

	// Send the "cookies"
	page.head.cookies.forEach((cookie) => {
		if (debug.enabled) {
			debugText.push(`res.cookie: name="${cookie.name}" value="${cookie.value}" options=${JSON.stringify(cookie.options)}`);
		}

		res.cookie(cookie.name, cookie.value, cookie.options);
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
		/** @type {Record<string, string>} */
		const headers = {};

		if (typeof page.head.contentType === 'string' && page.head.contentType.length > 0) {
			headers['Content-Type'] = page.head.contentType;
		}

		if (typeof page.file.fileSize === 'number' && page.file.fileSize > 0) {
			headers['Content-Length'] = page.file.fileSize.toString();
		}

		if (Object.keys(headers).length > 0) {
			if (debug.enabled) {
				debugText.push(`res.writeHead(200, ${JSON.stringify(headers)})`);
			}
			res.writeHead(200, headers);
		}

		// Check if fileBlob is a stream
		if (page.file.fileBlob instanceof stream.Readable) {
			if (debug.enabled) {
				debugText.push(`res.pipe("${page.file.fileType}") - streaming`);
				debug(getBlock('RESPONSE', debugText.join('\n')));
			}

			/** @type {Promise<void>} */
			const streamComplete = new Promise((resolve, reject) => {
				if (page.file.fileBlob instanceof stream.Readable) {
					page.file.fileBlob.pipe(res);
					page.file.fileBlob.on('end', () => resolve());
					/* v8 ignore next - error handler */
					page.file.fileBlob.on('error', (/** @type {Error} */ err) => reject(err));
					/* v8 ignore next - error handler */
					res.on('close', () => resolve());
				}
			});
			await streamComplete;
		} else {
			if (debug.enabled) {
				debugText.push(`res.end("${page.file.fileType}") - buffer`);
				debug(getBlock('RESPONSE', debugText.join('\n')));
			}

			res.end(page.file.fileBlob, 'binary');
		}
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
