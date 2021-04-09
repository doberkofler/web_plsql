/*
*	Page the raw page content and return the content to the client
*/

import {Trace} from './trace';
import express from 'express';

type cookieType = {
	name: string;
	value: string;
	path?: string;
	domain?: string;
	secure?: string;
	expires?: Date;
	httpOnly?: boolean;
};

type pageType = {
	body: string;
	head: {
		cookies: Array<cookieType>;
		contentType?: string;
		contentLength?: number;
		statusCode?: number;
		statusDescription?: string;
		redirectLocation?: string;
		otherHeaders: Record<string, unknown>;
		server?: string;
	};
	file: {
		fileType: any;
		fileSize: any;
		fileBlob: any;
	};
};

/**
*	Parse the header and split it up into the individual components
*
* @param {string} text - The text returned from the PL/SQL procedure.
* @returns {Object} - The parsed page.
*/
export function parse(text: string): pageType {
	const page: pageType = {
		body: '',
		head: {
			cookies: [],
			otherHeaders: {}
		},
		file: {
			fileType: null,
			fileSize: null,
			fileBlob: null
		}
	};

	//
	//	1)	Split up the text in header and body
	//

	// Find the end of the header identified by \n\n
	let head = '';
	const headerEndPosition = text.indexOf('\n\n');
	if (headerEndPosition === -1) {
		head = text;
	} else {
		head = text.substring(0, headerEndPosition + 2);
		page.body = text.substring(headerEndPosition + 2);
	}

	//
	//	2)	parse the headers
	//

	head.split('\n').forEach(line => {
		const header = getHeader(line);

		if (header) {
			switch (header.name.toLowerCase()) {
				case 'set-cookie':
					{
						const cookie = parseCookie(header.value);
						/* istanbul ignore else */
						if (cookie !== null) {
							page.head.cookies.push(cookie);
						}
					}
					break;

				case 'content-type':
					page.head.contentType = header.value;
					break;

				case 'x-db-content-length':
					{
						const contentLength = parseInt(header.value, 10);
						/* istanbul ignore else */
						if (!Number.isNaN(contentLength)) {
							page.head.contentLength = contentLength;
						}
					}
					break;

				case 'status':
					{
						const statusCode = parseInt(header.value, 10);
						/* istanbul ignore else */
						if (!Number.isNaN(statusCode)) {
							page.head.statusCode = statusCode;
							const index = header.value.indexOf(' ');
							/* istanbul ignore else */
							if (index !== -1) {
								page.head.statusDescription = header.value.substr(index + 1);
							}
						}
					}
					break;

				case 'location':
					page.head.redirectLocation = header.value;
					break;

				case 'x-oracle-ignore':
					break;

				default:
					page.head.otherHeaders[header.name] = header.value;
					break;
			}
		}
	});

	return page;
}

/*
*	get a header line
*/
function getHeader(line: string): {name: string; value: string} | null {
	const index = line.indexOf(':');

	if (index !== -1) {
		return {
			name: line.substr(0, index).trim(),
			value: line.substr(index + 1).trim()
		};
	}

	return null;
}

/*
*	Send "default" response to the browser
*/
export function send(req: express.Request, res: express.Response, page: {body: string; head: any; file: any}, trace: Trace): void {
	trace.write('send: ENTER');

	// Send the "cookies"
	page.head.cookies.forEach((cookie: Record<string, unknown>) => {
		const name = cookie.name as string;
		const value = cookie.value as string;

		delete cookie.name;
		delete cookie.value;

		res.cookie(name, value, cookie);
		trace.append(`send: res.cookie("${name}", "${value}")\n`);
	});

	// If there is a "redirectLocation" header, we immediately redirect and return
	if (typeof page.head.redirectLocation === 'string' && page.head.redirectLocation.length > 0) {
		res.redirect(302, page.head.redirectLocation);
		trace.append(`send: res.redirect(302, "${page.head.redirectLocation}")\n`);
		return;
	}

	// Send all the "otherHeaders"
	for (const key in page.head.otherHeaders) {
		res.set(key, page.head.otherHeaders[key]);
		trace.append(`send: res.set("${key}", "${page.head.otherHeaders[key]}")\n`);
	}

	// If this is a file download, we eventually set the "Content-Type" and the file content and then return.
	if (page.file.fileType === 'B' || page.file.fileType === 'F') {
		if (typeof page.head.contentType === 'string' && page.head.contentType.length > 0) {
			res.writeHead(200, {'Content-Type': page.head.contentType});
			trace.append(`sendFile: res.writeHead("Content-Type", "${page.head.contentType}")\n`);
		}
		res.end(page.file.fileBlob, 'binary');
		trace.append('send: res.end()\n');
		return;
	}

	// Is the a "contentType" header
	if (typeof page.head.contentType === 'string' && page.head.contentType.length > 0) {
		res.set('Content-Type', page.head.contentType);
		trace.append(`send: res.set("Content-Type", "${page.head.contentType}")\n`);
	}

	// If we have a "Status" header, we send the header and then return.
	if (typeof page.head.statusCode === 'number') {
		res.status(page.head.statusCode).send(page.head.statusDescription);
		return;
	}

	// Send the body
	res.send(page.body);
	trace.append(`send: res.send\n${'-'.repeat(30)}${page.body}\n${'-'.repeat(30)}\n`);

	trace.write('send: EXIT');
}

/*
*	Parses a cookie string
*/
function parseCookie(text: string): cookieType | null {
	// validate
	/* istanbul ignore next */
	if (typeof text !== 'string' || text.trim().length === 0) {
		return null;
	}

	// split the cookie into it's parts
	let cookieElements = text.split(';');

	// trim cookie elements
	cookieElements = cookieElements.map(element => element.trim());

	// get name and value
	const index = cookieElements[0].indexOf('=');
	/* istanbul ignore next */
	if (index <= 0) {
		// if the index is -1, there is no equal sign and if it's 0 the name is empty
		return null;
	}
	const cookie: any = {};
	cookie.name = cookieElements[0].substring(0, index).trim();
	cookie.value = cookieElements[0].substring(index + 1).trim();

	// remove the fisrt element
	cookieElements.shift();

	// get the other options
	cookieElements.forEach(element => {
		if (element.indexOf('path=') === 0) {
			cookie.path = element.substring(5);
		} else if (element.toLowerCase().indexOf('domain=') === 0) {
			cookie.domain = element.substring(7);
		} else if (element.toLowerCase().indexOf('secure=') === 0) {
			/* istanbul ignore next */
			cookie.secure = element.substring(7);
		} else if (element.toLowerCase().indexOf('expires=') === 0) {
			const date = tryDecodeDate(element.substring(8));
			if (date) {
				cookie.expires = date;
			}
		} else if (element.toLowerCase().indexOf('httponly') === 0) {
			cookie.httpOnly = true;
		}
	});

	return cookie;
}

/*
*	Decode a date
*/
function tryDecodeDate(value: string): Date | null {
	try {
		return new Date(value);
	} catch (err) {
		/* istanbul ignore next */
		return null;
	}
}
