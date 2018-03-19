// @flow

/*
*	Page the raw page content and return the content to the client
*/

import type Trace from './trace';

/**
*	Parse the header and split it up into the individual components
*
* @param {string} text - The text returned from the PL/SQL procedure.
* @returns {Object} - The parsed page.
*/
function parse(text: string): {body: string, head: Object, file: Object} {
	const page = {
		body: '',
		head: {
			server: '',
			cookies: [],
			contentType: '',
			contentLength: '',
			statusCode: 0,
			statusDescription: '',
			redirectLocation: '',
			otherHeaders: {}
		},
		file: {
			fileType: null,
			fileSize: null,
			fileBlob: null
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
	head.split('\n').forEach(headerLine => {
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

/**
*	Send "default" response to the browser
*
* @param {$Request} req - The req object represents the HTTP request.
* @param {$Response} res - The res object represents the HTTP response that an Express app sends when it gets an HTTP request.
* @param {Object} page - The page to render.
* @param {Trace} trace - Tracing object.
*/
function send(req: $Request, res: $Response, page: {body: string, head: Object, file: Object}, trace: Trace): void {
	trace.write('send: ENTER');

	// Send the "cookies"
	page.head.cookies.forEach(cookie => {
		const name = cookie.name;
		const value = cookie.value;

		delete cookie.name;
		delete cookie.value;

		res.cookie(name, value, cookie);
		trace.append(`send: res.cookie("${name}", "${value}")\n`);
	});

	// Is the a "redirectLocation" header
	if (typeof page.head.redirectLocation === 'string' && page.head.redirectLocation.length > 0) {
		res.redirect(302, page.head.redirectLocation);
		trace.append(`send: res.redirect(302, "${page.head.redirectLocation}")\n`);
		return;
	}

	// Is this a file download
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

	// Iterate over the headers object
	for (const key in page.head.otherHeaders) {
		if (key !== 'X-ORACLE-IGNORE') {
			res.set(key, page.head.otherHeaders[key]);
			trace.append(`send: res.set("${key}", "${page.head.otherHeaders[key]}")\n`);
		}
	}

	// Process the body
	if (typeof page.body === 'string' && page.body.length > 0) {
		res.send(page.body);
		trace.append(`send: res.send\n${'-'.repeat(30)}${page.body}\n${'-'.repeat(30)}\n`);
	}

	trace.write('send: EXIT');
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
	cookieElements = cookieElements.map(element => element.trim());

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
	cookieElements.forEach(element => {
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

module.exports = {
	parse: parse,
	send: send
};
