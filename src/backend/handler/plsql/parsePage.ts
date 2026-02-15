import debugModule from 'debug';
const debug = debugModule('webplsql:parsePage');

import type {pageType, cookieType} from '../../types.ts';

/**
 *	Parse the header and split it up into the individual components
 *
 * @param text - The text returned from the PL/SQL procedure.
 * @returns The parsed page.
 */
export const parsePage = (text: string): pageType => {
	const page: pageType = {
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
		head = text.slice(0, Math.max(0, headerEndPosition + 2));
		page.body = text.slice(Math.max(0, headerEndPosition + 2));
	}

	//
	//	2)	parse the headers
	//

	debug('parsing the headers received from PL/SQL');
	head.split('\n').forEach((line) => {
		const header = getHeader(line);

		if (header) {
			switch (header.name.toLowerCase()) {
				case 'set-cookie':
					{
						const cookie = parseCookie(header.value);
						debug(`oracle header "set-cookie" with value "${header.value}" was received has been parsed to ${JSON.stringify(cookie)}`);
						if (cookie === null) {
							throw new Error(`Unable to parse header "set-cookie" with value "${header.value}" received from PL/SQL`);
						} else {
							page.head.cookies.push(cookie);
						}
					}
					break;

				case 'content-type':
					page.head.contentType = header.value;
					debug(`oracle header "content-type" with value "${page.head.contentType}" was parsed`);
					break;

				case 'x-db-content-length':
					{
						const contentLength = Number.parseInt(header.value, 10);
						if (Number.isNaN(contentLength)) {
							throw new TypeError(`Unable to parse header "x-db-content-length" with value "${header.value}" received from PL/SQL`);
						} else {
							page.head.contentLength = contentLength;
							debug(`oracle header "x-db-content-length" with value "${page.head.contentLength}" was parsed`);
						}
					}
					break;

				case 'status':
					{
						const statusCode = Number.parseInt(header.value, 10);
						if (Number.isNaN(statusCode)) {
							throw new TypeError(`Unable to parse header "status" with value "${header.value}" received from PL/SQL`);
						} else {
							page.head.statusCode = statusCode;
							debug(`oracle header "status" with value "${page.head.statusCode}" was parsed`);
							const index = header.value.indexOf(' ');
							if (index !== -1) {
								page.head.statusDescription = header.value.slice(Math.max(0, index + 1));
							}
						}
					}
					break;

				case 'location':
					page.head.redirectLocation = header.value;
					debug(`oracle header "location" with value "${page.head.statusCode}" was parsed`);
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
 *	@param line - The line
 *	@returns The header.
 */
const getHeader = (line: string): {name: string; value: string} | null => {
	const index = line.indexOf(':');

	if (index !== -1) {
		return {
			name: line.slice(0, Math.max(0, index)).trim(),
			value: line.slice(Math.max(0, index + 1)).trim(),
		};
	}

	return null;
};

/**
 *	Parses a cookie string
 *	@param text - The cookie string.
 *	@returns The parsed cookie.
 */
const parseCookie = (text: string): cookieType | null => {
	// validate
	if (typeof text !== 'string' || text.trim().length === 0) {
		return null;
	}

	// split the cookie into it's parts
	let cookieElements = text.split(';');

	// trim cookie elements
	cookieElements = cookieElements.map((element) => element.trim());

	// get name and value
	const firstElement = cookieElements[0];
	if (!firstElement) {
		return null;
	}
	const index = firstElement.indexOf('=');
	if (index <= 0) {
		// if the index is -1, there is no equal sign and if it's 0 the name is empty
		return null;
	}

	const cookie: cookieType = {
		name: firstElement.slice(0, Math.max(0, index)).trim(),
		value: firstElement.slice(Math.max(0, index + 1)).trim(),
		options: {},
	};

	// remove the first element
	cookieElements.shift();

	// get the other options
	cookieElements.forEach((element) => {
		if (element.toLowerCase().startsWith('path=')) {
			cookie.options.path = element.slice(5);
		} else if (element.toLowerCase().startsWith('domain=')) {
			cookie.options.domain = element.slice(7);
		} else if (element.toLowerCase().startsWith('secure')) {
			cookie.options.secure = true;
		} else if (element.toLowerCase().startsWith('expires=')) {
			const date = tryDecodeDate(element.slice(8));
			if (date) {
				cookie.options.expires = date;
			}
		} else if (element.toLowerCase().startsWith('httponly')) {
			cookie.options.httpOnly = true;
		}
	});

	return cookie;
};

/**
 * Try to decode a date
 * @param value - The value to decode.
 * @returns The decoded date or null.
 */
const tryDecodeDate = (value: string): Date | null => {
	const result = new Date(value);
	if (Number.isNaN(result.getTime())) {
		return null;
	}
	return result;
};
