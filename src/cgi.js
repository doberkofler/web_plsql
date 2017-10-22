'use strict';

/**
* Module dependencies.
*/

const debug = require('debug')('node_plsql:cgi');
const os = require('os');
const log = require('./log');

/**
* Module variables.
*/

/**
* Create the HTTP_COOKIE string
*
* @param {Object} req - Request
* @return {String} Cookie string
* @api private
*/
function getCookieString(req) {
	let cookieString = '',
		propName = '';

	for (propName in req.cookies) {
		/* istanbul ignore else */
		if (req.cookies.hasOwnProperty(propName)) {
			cookieString += propName + '=' + req.cookies[propName] + ';';
		}
	}

	return cookieString;
}

/**
* Create a CGI object
*
* @param {Object} options -- Configuration options
* @param {Object} req - Request
* @param {Object} service - Service configuration
* @return {String} CGI object
* @api public
*/
function createCGI(options, req, service) {
	const PROTOCOL = req.protocol ? req.protocol.toUpperCase() : '';
	const CHARSET = 'UTF8';
	const IANA_CHARSET = 'UTF-8';
	let cookieString;
	let cgi;

	// debug
	debug('createCGI');

	if (typeof options !== 'object' || typeof req !== 'object' || typeof service !== 'object') {
		log.exit(new Error('Invalid arguments'));
	}

	cookieString = getCookieString(req);

	cgi = {
		'PLSQL_GATEWAY': 'WebDb',
		'GATEWAY_IVERSION': '2',
		'SERVER_SOFTWARE': 'NodeJS-PL/SQL-Gateway',
		'GATEWAY_INTERFACE': 'CGI/1.1',
		'SERVER_PORT': options.server.port.toString(),
		'SERVER_NAME': os.hostname(),
		'REQUEST_METHOD': req.method,
		'PATH_INFO': req.params.name,
		'SCRIPT_NAME': service.route,
		'REMOTE_ADDR': (req.ip || '').replace('::ffff:', ''),
		'SERVER_PROTOCOL': PROTOCOL + '/' + req.httpVersion,
		'REQUEST_PROTOCOL': PROTOCOL,
		'REMOTE_USER': '',
		'HTTP_USER_AGENT': req.get('user-agent'),
		'HTTP_HOST': req.get('host'),
		'HTTP_ACCEPT': req.get('accept'),
		'HTTP_ACCEPT_ENCODING': req.get('accept-encoding'),
		'HTTP_ACCEPT_LANGUAGE': req.get('accept-language'),
		'HTTP_REFERER': req.get('referer') || '',
		'HTTP_X_FORWARDED_FOR': req.get('x-forwarded-for') || '',
		'WEB_AUTHENT_PREFIX': '',
		'DAD_NAME': service.route,
		'DOC_ACCESS_PATH': 'doc',
		'DOCUMENT_TABLE': service.documentTableName || '',
		'PATH_ALIAS': '',
		'REQUEST_CHARSET': CHARSET,
		'REQUEST_IANA_CHARSET': IANA_CHARSET,
		'SCRIPT_PREFIX': '/'
	};

	// Add cookies
	if (cookieString.length > 0) {
		cgi.HTTP_COOKIE = cookieString;
	}

	return cgi;
}

module.exports = {
	createCGI: createCGI
};
