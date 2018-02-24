// @flow

/*
*	Prepare the CGI information
*/

const debug = require('debug')('web_plsql:cgi');
const os = require('os');

import type {oracleExpressMiddleware$options} from './config';

/**
* Create a CGI object
*
* @param {$Request} req - The req object represents the HTTP request.
* @param {oracleExpressMiddleware$options} options - the options for the middleware.
* @returns {string} CGI object
*/
module.exports = function getCGI(req: $Request, options: oracleExpressMiddleware$options) {
	debug('getCGI: start');

	const PROTOCOL = req.protocol ? req.protocol.toUpperCase() : '';
	const CHARSET = 'UTF8';
	const IANA_CHARSET = 'UTF-8';

	const DEFAULT_CGI = {
		'PLSQL_GATEWAY': 'WebDb',
		'GATEWAY_IVERSION': '2',
		'SERVER_SOFTWARE': 'web_plsql',
		'GATEWAY_INTERFACE': 'CGI/1.1',
		//	TODO	'SERVER_PORT': req.get('port').toString(),
		'SERVER_NAME': os.hostname(),
		'REQUEST_METHOD': req.method,
		'PATH_INFO': req.params.name,
		//	TODO	'SCRIPT_NAME': service.route,
		'REMOTE_ADDR': (req.ip || '').replace('::ffff:', ''),
		'SERVER_PROTOCOL': PROTOCOL + '/' + req.httpVersion,
		'REQUEST_PROTOCOL': PROTOCOL,
		'REMOTE_USER': '',
		'HTTP_COOKIE': getCookieString(req),
		'HTTP_USER_AGENT': req.get('user-agent'),
		'HTTP_HOST': req.get('host'),
		'HTTP_ACCEPT': req.get('accept'),
		'HTTP_ACCEPT_ENCODING': req.get('accept-encoding'),
		'HTTP_ACCEPT_LANGUAGE': req.get('accept-language'),
		'HTTP_REFERER': req.get('referer') || '',
		'HTTP_X_FORWARDED_FOR': req.get('x-forwarded-for') || '',
		'WEB_AUTHENT_PREFIX': '',
		'DAD_NAME': '', // TODO: this should be filled automagically
		'DOC_ACCESS_PATH': 'doc',
		'DOCUMENT_TABLE': options.doctable || '',
		'PATH_ALIAS': '',
		'REQUEST_CHARSET': CHARSET,
		'REQUEST_IANA_CHARSET': IANA_CHARSET,
		'SCRIPT_PREFIX': '/'
	};

	for (const key in options.cgi) {
		DEFAULT_CGI[key] = options.cgi[key];
	}

	return DEFAULT_CGI;
};

/*
* Create the HTTP_COOKIE string
*
* @param {$Request} req - The req object represents the HTTP request.
* @return {string} Cookie string
*/
function getCookieString(req: $Request): string {
	let cookieString = '';

	for (const propName in req.cookies) {
		cookieString += propName + '=' + req.cookies[propName] + ';';
	}

	return cookieString;
}
