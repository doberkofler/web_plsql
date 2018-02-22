// @flow

/*
*	Page the raw page content and return the content to the client
*/

const debug = require('debug')('oracleExpressMiddleware:page');
const _ = require('lodash');

import type {oracleExpressMiddleware$options} from './index';

/**
*	Parse the text returned by Oracle and send it back to the client
*
* @param {$Request} req - The req object represents the HTTP request.
* @param {$Response} res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
* @param {oracleExpressMiddleware$options} options - the options for the middleware.
* @param {string} text - The text returned from the PL/SQL procedure.
*/
function parseAndSend(req: $Request, res: $Response, options: oracleExpressMiddleware$options, text: string): void {
	debug('parseAndSend: start');

	// parse the content
	const message = parse(text);

	// add "Server" header
	//	TODO	message.head.Server = cgiObj.SERVER_SOFTWARE;

	// Send the "cookies"
	message.head.cookies.forEach((cookie) => {
		res.cookie(cookie.name, cookie.value, _.omit(cookie, ['name', 'value']));
	});

	// Is the a "redirectLocation" header
	if (typeof message.head.redirectLocation === 'string' && message.head.redirectLocation.length > 0) {
		res.redirect(302, message.head.redirectLocation);
		return;
	}

	// Is the a "contentType" header
	if (typeof message.head.contentType === 'string' && message.head.contentType.length > 0) {
		res.set('Content-Type', message.head.contentType);
	}

	// Iterate over the headers object
	_.each(message.head.otherHeaders, (value, key) => {
		res.set(key, value);
	});

	// Process the body
	if (typeof message.body === 'string' && message.body.length > 0) {
		res.send(message.body);
	}
}

/*
*	Parse the header and split it up into the individual components
*/
function parse(text: string) {
	const page = {
		body: '',
		head: {
			cookies: [],
			contentType: '',
			contentLength: '',
			statusCode: 0,
			statusDescription: '',
			redirectLocation: '',
			otherHeaders: {}
		}
	};

	// Split up the text in header and body
	let head = '';
	if (containsHttpHeader(text)) {
		// Find the end of the header identified by \n\n
		let headerEndPosition = text.indexOf('\n\n');

		// If we find no end of header marker, we only received a header without actual body
		if (headerEndPosition === -1) {
			head = text;
		} else {
			headerEndPosition += 2;
			head = text.substring(0, headerEndPosition);
			page.body = text.substring(headerEndPosition);
		}
	} else {
		page.body = text;
	}

	// parse the headers
	head.split('\n').forEach((headerLine) => {
		// Set-Cookie
		if (headerLine.indexOf('Set-Cookie: ') === 0) {
			const cookie = parseCookie(headerLine.substr(12));
			if (cookie) {
				page.head.cookies.push(cookie);
			}

		// Content-type
		} else if (headerLine.indexOf('Content-type: ') === 0) {
			page.head.contentType = headerLine.substr(14);

		// X-DB-Content-length
		} else if (headerLine.indexOf('X-DB-Content-length: ') === 0) {
			page.head.contentLength = headerLine.substr(21);

		// Status
		} else if (headerLine.indexOf('Status: ') === 0) {
			const s = headerLine.substr(8);
			const t = s.split(' ')[0];
			page.head.statusCode = parseInt(t, 10);
			page.head.statusDescription = s.substr(t.length + 1);

		// Location
		} else if (headerLine.indexOf('Location: ') === 0) {
			page.head.redirectLocation = headerLine.substr(10);

		// Other headers
		} else {
			const index = headerLine.indexOf(':');
			if (index !== -1) {
				page.head.otherHeaders[headerLine.substr(0, index)] = headerLine.substr(index + 2);
			}
		}
	});

	return page;
}

/*
*	Does the body contain a HTTP header
*/
function containsHttpHeader(text: string): boolean {
	const t = text.toUpperCase();

	return (t.indexOf('CONTENT-TYPE: ') !== -1 || t.indexOf('SET-COOKIE: ') !== -1 || t.indexOf('LOCATION: ') !== -1 || t.indexOf('STATUS: ') !== -1 || t.indexOf('X-DB-CONTENT-LENGTH: ') !== -1 || t.indexOf('WWW-AUTHENTICATE: ') !== -1);
}

/*
*	Parses a cookie string
*/
function parseCookie(text: string) {
	let Undefined;

	// validate
	if (typeof text !== 'string' || text.trim().length === 0) {
		return Undefined;
	}

	// split the cookie into it's parts
	let cookieElements = text.split(';');

	// trim cookie elements
	cookieElements = cookieElements.map((element) => element.trim());

	// get name and value
	const index = cookieElements[0].indexOf('=');
	if (index <= 0) {
		// if the index is -1, there is no equal sign and if it's 0 the name is empty
		return Undefined;
	}
	const cookie = {};
	cookie.name = cookieElements[0].substring(0, index).trim();
	cookie.value = cookieElements[0].substring(index + 1).trim();

	// remove the fisrt element
	cookieElements.shift();

	// get the other options
	cookieElements.forEach((element) => {
		if (element.indexOf('path=') === 0) {
			cookie.path = element.substring(5);
		} else if (element.toLowerCase().indexOf('domain=') === 0) {
			cookie.domain = element.substring(7);
		} else if (element.toLowerCase().indexOf('secure=') === 0) {
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
		return null;
	}
}

module.exports = parseAndSend;
