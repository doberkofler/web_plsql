/**
 * @typedef {import('./types.js').pageType} pageType
 * @typedef {import('./types.js').cookieType} cookieType
 */

/**
 *	Parse the header and split it up into the individual components
 *
 * @param {string} text - The text returned from the PL/SQL procedure.
 * @returns {pageType} - The parsed page.
 */
export const parsePage = (text) => {
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
