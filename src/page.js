/*
 *	Page the raw page content and return the content to the client
 */

import debugModule from 'debug';
const debug = debugModule('webplsql:page');

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('./types.js').environmentType} environmentType
 * @typedef {import('./types.js').middlewareOptions} middlewareOptions
 */

/**
 * @typedef {object} cookieType
 * @property {string} name - The name of the cookie.
 * @property {string} value - The value of the cookie.
 * @property {string} [path] - The path of the cookie.
 * @property {string} [domain] - The domain of the cookie.
 * @property {string} [secure] - The secure flag.
 * @property {Date} [expires] - The expiration date.
 * @property {boolean} [httpOnly] - The httpOnly flag.
 */

/**
 * @typedef {object} pageType - The page.
 * @property {string} body - The body of the page.
 * @property {object} head - The head of the page.
 * @property {cookieType[]} head.cookies - The cookies.
 * @property {string} [head.contentType] - The content type.
 * @property {number} [head.contentLength] - The content length.
 * @property {number} [head.statusCode] - The status code.
 * @property {string} [head.statusDescription] - The status description.
 * @property {string} [head.redirectLocation] - The redirect location.
 * @property {Record<string, string>} head.otherHeaders - The other headers.
 * @property {string} [head.server] - The server.
 * @property {object} file - The file.
 * @property {string | null} file.fileType - The file type.
 * @property {number | null} file.fileSize - The file size.
 * @property {Buffer | null} file.fileBlob - The file blob.
 */

/**
 * Try to decode a date
 * @param {string} value - The value to decode.
 * @returns {Date | null} - The decoded date or null.
 */
const tryDecodeDate = (value) => {
	try {
		return new Date(value);
	} catch (err) {
		/* istanbul ignore next */
		return null;
	}
};

/**
 *	Parse the header and split it up into the individual components
 *
 * @param {string} text - The text returned from the PL/SQL procedure.
 * @returns {pageType} - The parsed page.
 */
export const parse = (text) => {
	/** @type {pageType} */
	const page = {
		body: '',
		head: {
			cookies: [],
			otherHeaders: {},
		},
		file: {
			fileType: null,
			fileSize: null,
			fileBlob: null,
		},
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

	head.split('\n').forEach((line) => {
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
								page.head.statusDescription = header.value.substring(index + 1);
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
};

/**
 *	Get a header line
 *	@param {string} line - The line
 *	@returns {{name: string, value: string} | null} - The header.
 */
const getHeader = (line) => {
	const index = line.indexOf(':');

	if (index !== -1) {
		return {
			name: line.substring(0, index).trim(),
			value: line.substring(index + 1).trim(),
		};
	}

	return null;
};

/**
 *	Send "default" response to the browser
 *	@param {Request} req - The req object represents the HTTP request.
 *	@param {Response} res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
 *	@param {pageType} page - The page to send.
 *	@returns {void}
 */
export const sendResponse = (req, res, page) => {
	const debugText = ['sendResponse'];
	/** @param {string} text - The debug text */
	const addDebugText = (text) => {
		if (debug.enabled) {
			debugText.push(text);
		}
	};

	// Send the "cookies"
	page.head.cookies.forEach((cookie) => {
		const {name, value} = cookie;

		/*
		delete cookie.name;
		delete cookie.value;
		*/

		addDebugText(`send: res.cookie("${name}", "${value}")`);
		res.cookie(name, value);
	});

	// If there is a "redirectLocation" header, we immediately redirect and return
	if (typeof page.head.redirectLocation === 'string' && page.head.redirectLocation.length > 0) {
		addDebugText(`send: res.redirect(302, "${page.head.redirectLocation}")`);
		debug(debugText.join('\n'));
		res.redirect(302, page.head.redirectLocation);
		return;
	}

	// Send all the "otherHeaders"
	for (const key in page.head.otherHeaders) {
		addDebugText(`res.set("${key}", "${page.head.otherHeaders[key]}")`);
		res.set(key, page.head.otherHeaders[key]);
	}

	// If this is a file download, we eventually set the "Content-Type" and the file content and then return.
	if (page.file.fileType === 'B' || page.file.fileType === 'F') {
		if (typeof page.head.contentType === 'string' && page.head.contentType.length > 0) {
			addDebugText(`res.writeHead("Content-Type", "${page.head.contentType}")`);
			res.writeHead(200, {'Content-Type': page.head.contentType});
		}
		addDebugText(`res.end("${page.file.fileType}")`);
		debug(debugText.join('\n'));
		res.end(page.file.fileBlob, 'binary');
		return;
	}

	// Is the a "contentType" header
	if (typeof page.head.contentType === 'string' && page.head.contentType.length > 0) {
		addDebugText(`res.set("Content-Type", "${page.head.contentType}")`);
		res.set('Content-Type', page.head.contentType);
	}

	// If we have a "Status" header, we send the header and then return.
	if (typeof page.head.statusCode === 'number') {
		addDebugText(`res.status(page.head.statusCode).send("${page.head.statusDescription}")`);
		debug(debugText.join('\n'));
		res.status(page.head.statusCode).send(page.head.statusDescription);
		return;
	}

	// Send the body
	addDebugText(`res.send\n${'-'.repeat(30)}${page.body}\n${'-'.repeat(30)}`);
	debug(debugText.join('\n'));

	res.send(page.body);
};

/**
 *	Parses a cookie string
 *	@param {string} text - The cookie string.
 *	@returns {cookieType | null} - The parsed cookie.
 */
const parseCookie = (text) => {
	// validate
	/* istanbul ignore next */
	if (typeof text !== 'string' || text.trim().length === 0) {
		return null;
	}

	// split the cookie into it's parts
	let cookieElements = text.split(';');

	// trim cookie elements
	cookieElements = cookieElements.map((element) => element.trim());

	// get name and value
	const index = cookieElements[0].indexOf('=');
	/* istanbul ignore next */
	if (index <= 0) {
		// if the index is -1, there is no equal sign and if it's 0 the name is empty
		return null;
	}

	/** @type {cookieType} */
	const cookie = {
		name: cookieElements[0].substring(0, index).trim(),
		value: cookieElements[0].substring(index + 1).trim(),
	};

	// remove the fisrt element
	cookieElements.shift();

	// get the other options
	cookieElements.forEach((element) => {
		if (element.startsWith('path=')) {
			cookie.path = element.substring(5);
		} else if (element.toLowerCase().startsWith('domain=')) {
			cookie.domain = element.substring(7);
		} else if (element.toLowerCase().startsWith('secure=')) {
			/* istanbul ignore next */
			cookie.secure = element.substring(7);
		} else if (element.toLowerCase().startsWith('expires=')) {
			const date = tryDecodeDate(element.substring(8));
			if (date) {
				cookie.expires = date;
			}
		} else if (element.toLowerCase().startsWith('httponly')) {
			cookie.httpOnly = true;
		}
	});

	return cookie;
};
