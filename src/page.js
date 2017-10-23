'use strict';

/**
* Module dependencies.
*/

const debug = require('debug')('node_plsql:parse');
const _ = require('underscore');
const log = require('./log');

/**
* Parse the text returned by the PL/SQL procedure
*
* @param {String} text - The text returned from the PL/SQL procedure
* @return {Object} An object with the parsed components: body, headers, cookies
* @api public
*/
function parseContent(text) {
	let headerAndBody,
		message;

	// debug
	debug('parseContent');

	// validate
	if (arguments.length !== 1 || typeof text !== 'string') {
		log.exit(new Error('invalid arguments'));
	}

	// separate header and body
	headerAndBody = _getHeaderAndBody(text);

	// parse the header
	message = _parseHeader(headerAndBody.header);
	message.body = headerAndBody.body;

	return message;
}

/*

/**
* Parse the text returned by the procedure and separate header and body
* @param {String} text - An http page
* @return {Object} An object with a header and body property
* @api private
*/
function _getHeaderAndBody(text) {
	let obj = {
		header: '',
		body: ''
	};
	let headerEndPosition;

	if (typeof text !== 'string' || text.length === 0) {
		return obj;
	}

	// Split up the text in header and body
	if (_containsHttpHeader(text)) {
		// Find the end of the header identified by \n\n
		headerEndPosition = text.indexOf('\n\n');

		// If we find no end of header marker, we only received a header without actual body
		if (headerEndPosition === -1) {
			obj.header = text;
		} else {
			headerEndPosition += 2;
			obj.header = text.substring(0, headerEndPosition);
			obj.body = text.substring(headerEndPosition);
		}
	} else {
		obj.body = text;
	}

	return obj;
}

/**
* Parse the header and split it up into the individual components
*
* @param {String} text - The http header as text
* @return {Object} An object with the parsed components: body, headers, cookies
* @api private
*/
function _parseHeader(text) {
	let message = {
			redirectLocation: null,
			contentType: null,
			contentLength: null,
			statusCode: null,
			statusDescription: null,
			headers: {},
			cookies: []
		},
		headerLines,
		headerLine,
		cookie,
		index,
		s,
		t,
		i;

	if (typeof text !== 'string' || text.length === 0) {
		return message;
	}

	// split the header text into lines
	headerLines = text.split('\n');

	// parse the individual header lines
	for (i = 0; i < headerLines.length; i++) {
		headerLine = headerLines[i];

		// Set-Cookie
		if (headerLine.indexOf('Set-Cookie: ') === 0) {
			cookie = _parseCookie(headerLine.substr(12));
			if (cookie) {
				message.cookies.push(cookie);
			}

		// Content-type
		} else if (headerLine.indexOf('Content-type: ') === 0) {
			message.contentType = headerLine.substr(14);

		// X-DB-Content-length
		} else if (headerLine.indexOf('X-DB-Content-length: ') === 0) {
			message.contentLength = parseInt(headerLine.substr(21), 10);

		// Status
		} else if (headerLine.indexOf('Status: ') === 0) {
			s = headerLine.substr(8);
			t = s.split(' ')[0];
			message.statusCode = parseInt(t, 10);
			message.statusDescription = s.substr(t.length + 1);

		// Location
		} else if (headerLine.indexOf('Location: ') === 0) {
			message.redirectLocation = headerLine.substr(10);

		// Other headers
		} else {
			index = headerLine.indexOf(':');
			debug('index=' + index + ' headerLine=' + headerLine);
			if (index !== -1) {
				message.headers[headerLine.substr(0, index)] = headerLine.substr(index + 2);
			}
		}
	}

	return message;
}

/**
* Does the body contain a HTTP header
* @param {String} text - A body
* @return {Boolean} true if the body constains an HTTP header
* @api private
*/
function _containsHttpHeader(text) {
	let t = text.toUpperCase();

	return (t.indexOf('CONTENT-TYPE: ') !== -1 || t.indexOf('SET-COOKIE: ') !== -1 || t.indexOf('LOCATION: ') !== -1 || t.indexOf('STATUS: ') !== -1 || t.indexOf('X-DB-CONTENT-LENGTH: ') !== -1 || t.indexOf('WWW-AUTHENTICATE: ') !== -1);
}

/**
* Parses a cookie string
* @param {String} text - String containing a cookie
* @return {Object} An object representing the cookie
* @api private
*/
function _parseCookie(text) {
	let Undefined,
		cookieElements,
		index,
		cookie = {};

	function tryDecodeDate(str) {
		try {
			return new Date(str);
		} catch (err) {
			/* istanbul ignore next */
			return null;
		}
	}

	// validate
	if (typeof text !== 'string' || text.trim().length === 0) {
		return Undefined;
	}

	// split the cookie into it's parts
	cookieElements = text.split(';');

	// trim cookie elements
	cookieElements = _.map(cookieElements, function (element) {
		return element.trim();
	});

	// get name and value
	index = cookieElements[0].indexOf('=');
	if (index <= 0) {
		// if the index is -1, there is no equal sign and if it's 0 the name is empty
		return Undefined;
	}
	cookie.name = cookieElements[0].substring(0, index).trim();
	cookie.value = cookieElements[0].substring(index + 1).trim();

	// remove the fisrt element
	cookieElements.shift();

	// get the other options
	_.each(cookieElements, function (element) {
		if (element.indexOf('path=') === 0) {
			cookie.path = element.substring(5);
		} else if (element.toLowerCase().indexOf('domain=') === 0) {
			cookie.domain = element.substring(7);
		} else if (element.toLowerCase().indexOf('secure=') === 0) {
			cookie.secure = element.substring(7);
		} else if (element.toLowerCase().indexOf('expires=') === 0) {
			let date = tryDecodeDate(element.substring(8));
			/* istanbul ignore else */
			if (date) {
				cookie.expires = date;
			}
		} else if (element.toLowerCase().indexOf('httponly') === 0) {
			cookie.httpOnly = true;
		}
	});

	return cookie;
}

module.exports = {
	parseContent: parseContent
};
