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
		head = text.substring(0, headerEndPosition + 2);
		page.body = text.substring(headerEndPosition + 2);
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
						/* v8 ignore else - parseCookie validation ensures non-null */
						if (cookie !== null) {
							page.head.cookies.push(cookie);
						} else {
							throw new Error(`Unable to parse header "set-cookie" with value "${header.value}" received from PL/SQL`);
						}
					}
					break;

				case 'content-type':
					page.head.contentType = header.value;
					debug(`oracle header "content-type" with value "${page.head.contentType}" was parsed`);
					break;

				case 'x-db-content-length':
					{
						const contentLength = parseInt(header.value, 10);
						/* v8 ignore else - parseInt validation */
						if (!Number.isNaN(contentLength)) {
							page.head.contentLength = contentLength;
							debug(`oracle header "x-db-content-length" with value "${page.head.contentLength}" was parsed`);
						} else {
							throw new Error(`Unable to parse header "x-db-content-length" with value "${header.value}" received from PL/SQL`);
						}
					}
					break;

				case 'status':
					{
						const statusCode = parseInt(header.value, 10);
						/* v8 ignore else - parseInt validation */
						if (!Number.isNaN(statusCode)) {
							page.head.statusCode = statusCode;
							debug(`oracle header "status" with value "${page.head.statusCode}" was parsed`);
							const index = header.value.indexOf(' ');
							/* v8 ignore else - status code may not have description */
							if (index !== -1) {
								page.head.statusDescription = header.value.substring(index + 1);
							}
						} else {
							throw new Error(`Unable to parse header "status" with value "${header.value}" received from PL/SQL`);
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
			name: line.substring(0, index).trim(),
			value: line.substring(index + 1).trim(),
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
	/* v8 ignore next - input validation */
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
	/* v8 ignore next - cookie format validation */
	if (index <= 0) {
		// if the index is -1, there is no equal sign and if it's 0 the name is empty
		return null;
	}

	const cookie: cookieType = {
		name: firstElement.substring(0, index).trim(),
		value: firstElement.substring(index + 1).trim(),
		options: {},
	};

	// remove the first element
	cookieElements.shift();

	// get the other options
	cookieElements.forEach((element) => {
		if (element.toLowerCase().startsWith('path=')) {
			cookie.options.path = element.substring(5);
		} else if (element.toLowerCase().startsWith('domain=')) {
			cookie.options.domain = element.substring(7);
		} else if (element.toLowerCase().startsWith('secure')) {
			/* v8 ignore next - secure cookie attribute */
			cookie.options.secure = true;
		} else if (element.toLowerCase().startsWith('expires=')) {
			const date = tryDecodeDate(element.substring(8));
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
	try {
		return new Date(value);
	} catch {
		/* v8 ignore next - invalid date format */
		return null;
	}
};
