/*
 *	Page the raw page content and return the content to the client
 */

import debugModule from 'debug';
const debug = debugModule('webplsql:sendResponse');

import stream from 'node:stream';
import {getBlock} from '../../util/trace.ts';
import type {Request, Response} from 'express';
import type {pageType} from '../../types.ts';

/**
 * Pipe a readable to the response and await completion.
 * Listeners are attached before piping to avoid races.
 *
 * @param readable - The source readable stream.
 * @param res - The HTTP response stream.
 */
const pipeReadableToResponse = async (readable: stream.Readable, res: Response): Promise<void> => {
	await new Promise<void>((resolve, reject) => {
		let settled = false;
		const canAddResponseListener = typeof res.on === 'function';
		const canRemoveResponseListener = typeof res.removeListener === 'function';

		const cleanup = () => {
			readable.removeListener('end', onReadableEnd);
			readable.removeListener('close', onReadableClose);
			readable.removeListener('error', onReadableError);
			if (canRemoveResponseListener) {
				res.removeListener('finish', onResponseFinish);
				res.removeListener('close', onResponseClose);
			}
		};

		const resolveOnce = () => {
			if (settled) {
				return;
			}
			settled = true;
			cleanup();
			resolve();
		};

		const rejectOnce = (error: Error) => {
			if (settled) {
				return;
			}
			settled = true;
			cleanup();
			reject(error);
		};

		const onReadableEnd = () => {
			resolveOnce();
		};

		const onReadableClose = () => {
			resolveOnce();
		};

		const onReadableError = (error: Error) => {
			rejectOnce(error);
		};

		const onResponseFinish = () => {
			resolveOnce();
		};

		const onResponseClose = () => {
			resolveOnce();
		};

		readable.on('end', onReadableEnd);
		readable.on('close', onReadableClose);
		readable.on('error', onReadableError);
		if (canAddResponseListener) {
			res.on('finish', onResponseFinish);
			res.on('close', onResponseClose);
		}

		try {
			readable.pipe(res);
		} catch (error: unknown) {
			rejectOnce(error instanceof Error ? error : new Error(String(error)));
		}
	});
};

/**
 *	Send "default" response to the browser
 *	@param _req - The req object represents the HTTP request.
 *	@param res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 *	@param page - The page to send.
 */
export const sendResponse = async (_req: Request, res: Response, page: pageType): Promise<void> => {
	const debugText: string[] = [];

	// Send the "cookies"
	page.head.cookies.forEach((cookie) => {
		/* v8 ignore start */
		if (debug.enabled) {
			debugText.push(`res.cookie: name="${cookie.name}" value="${cookie.value}" options=${JSON.stringify(cookie.options)}`);
		}
		/* v8 ignore stop */

		res.cookie(cookie.name, cookie.value, cookie.options);
	});

	// If there is a "redirectLocation" header, we immediately redirect and return
	if (typeof page.head.redirectLocation === 'string' && page.head.redirectLocation.length > 0) {
		/* v8 ignore start */
		if (debug.enabled) {
			debugText.push(`res.redirect(302, "${page.head.redirectLocation}")`);
			debug(getBlock('RESPONSE', debugText.join('\n')));
		}
		/* v8 ignore stop */

		res.redirect(302, page.head.redirectLocation);
		return;
	}

	// Send all the "otherHeaders"
	for (const key in page.head.otherHeaders) {
		/* v8 ignore start */
		if (debug.enabled) {
			debugText.push(`res.set("${key}", "${page.head.otherHeaders[key]}")`);
		}
		/* v8 ignore stop */

		res.set(key, page.head.otherHeaders[key]);
	}

	// If this is a file download, we eventually set the "Content-Type" and the file content and then return.
	if (page.file.fileType === 'B' || page.file.fileType === 'F') {
		const headers: Record<string, string> = {};

		if (typeof page.head.contentType === 'string' && page.head.contentType.length > 0) {
			headers['Content-Type'] = page.head.contentType;
		}

		if (typeof page.file.fileSize === 'number' && page.file.fileSize > 0) {
			headers['Content-Length'] = page.file.fileSize.toString();
		}

		if (Object.keys(headers).length > 0) {
			/* v8 ignore start */
			if (debug.enabled) {
				debugText.push(`res.writeHead(200, ${JSON.stringify(headers)})`);
			}
			/* v8 ignore stop */

			res.writeHead(200, headers);
		}

		// Check if fileBlob is a stream
		if (page.file.fileBlob instanceof stream.Readable) {
			/* v8 ignore start */
			if (debug.enabled) {
				debugText.push(`res.pipe("${page.file.fileType ?? ''}") - streaming`);
				debug(getBlock('RESPONSE', debugText.join('\n')));
			}
			/* v8 ignore stop */

			await pipeReadableToResponse(page.file.fileBlob, res);
		} else {
			/* v8 ignore start */
			if (debug.enabled) {
				debugText.push(`res.end("${page.file.fileType ?? ''}") - buffer`);
				debug(getBlock('RESPONSE', debugText.join('\n')));
			}
			/* v8 ignore stop */

			res.end(page.file.fileBlob, 'binary');
		}
		return;
	}

	// Is the a "contentType" header
	if (typeof page.head.contentType === 'string' && page.head.contentType.length > 0) {
		/* v8 ignore start */
		if (debug.enabled) {
			debugText.push(`res.set("Content-Type", "${page.head.contentType}")`);
		}
		/* v8 ignore stop */

		res.set('Content-Type', page.head.contentType);
	}

	// If we have a "Status" header, we send the header and then return.
	if (typeof page.head.statusCode === 'number') {
		/* v8 ignore start */
		if (debug.enabled) {
			debugText.push(`res.status(page.head.statusCode).send("${page.head.statusDescription ?? ''}")`);
			debug(getBlock('RESPONSE', debugText.join('\n')));
		}
		/* v8 ignore stop */

		res.status(page.head.statusCode).send(page.head.statusDescription);
		return;
	}

	// Send the body
	/* v8 ignore start */
	if (debug.enabled) {
		if (page.body instanceof stream.Readable) {
			debugText.push(`${'-'.repeat(60)}\n[Stream Body]`);
		} else {
			debugText.push(`${'-'.repeat(60)}\n${page.body}`);
		}
		debug(getBlock('RESPONSE', debugText.join('\n')));
	}
	/* v8 ignore stop */

	if (page.body instanceof stream.Readable) {
		await pipeReadableToResponse(page.body, res);
	} else {
		res.send(page.body);
	}
};