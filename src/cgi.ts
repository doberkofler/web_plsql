/*
*	Prepare the CGI information
*/

import os from 'os';
import {URL} from 'url';
import express from 'express';
export type environmentType = {[key: string]: string};
import type {oracleExpressMiddleware$options} from './config';

/**
* Create a CGI object
*
* @param {express.Request} req - The req object represents the HTTP request.
* @param {oracleExpressMiddleware$options} options - the options for the middleware.
* @returns {string} CGI object
*/
export function getCGI(req: express.Request, options: oracleExpressMiddleware$options): environmentType {
	const PROTOCOL = req.protocol ? req.protocol.toUpperCase() : '';
	const CHARSET = 'UTF8';
	const IANA_CHARSET = 'UTF-8';
	const PATH = getPath(req);

	const DEFAULT_CGI: environmentType = {
		'PLSQL_GATEWAY': 'WebDb',
		'GATEWAY_IVERSION': '2',
		'SERVER_SOFTWARE': 'web_plsql',
		'GATEWAY_INTERFACE': 'CGI/1.1',
		'SERVER_PORT': typeof req.socket.localPort === 'number' ? req.socket.localPort.toString() : '',
		'SERVER_NAME': os.hostname(),
		'REQUEST_METHOD': req.method,
		'PATH_INFO': req.params.name,
		'SCRIPT_NAME': PATH.script,
		'REMOTE_ADDR': (req.ip || '').replace('::ffff:', ''),
		'SERVER_PROTOCOL': `${PROTOCOL}/${req.httpVersion}`,
		'REQUEST_PROTOCOL': PROTOCOL,
		'REMOTE_USER': '',
		'HTTP_COOKIE': getCookieString(req),
		'HTTP_USER_AGENT': req.get('user-agent') || '',
		'HTTP_HOST': req.get('host') || '',
		'HTTP_ACCEPT': req.get('accept') || '',
		'HTTP_ACCEPT_ENCODING': req.get('accept-encoding') || '',
		'HTTP_ACCEPT_LANGUAGE': req.get('accept-language') || '',
		'HTTP_REFERER': req.get('referer') || '',
		'HTTP_X_FORWARDED_FOR': req.get('x-forwarded-for') || '',
		'WEB_AUTHENT_PREFIX': '',
		'DAD_NAME': PATH.dad,
		'DOC_ACCESS_PATH': 'doc',
		'DOCUMENT_TABLE': options.doctable || '',
		'PATH_ALIAS': '',
		'REQUEST_CHARSET': CHARSET,
		'REQUEST_IANA_CHARSET': IANA_CHARSET,
		'SCRIPT_PREFIX': PATH.prefix
	};

	return Object.assign(DEFAULT_CGI, options.cgi);
}

/*
* Create the HTTP_COOKIE string
*/
function getCookieString(req: express.Request): string {
	let cookieString = '';

	for (const propName in req.cookies) {
		cookieString += `${propName}=${req.cookies[propName]};`;
	}

	return cookieString;
}

/*
* Get the script name and DAD name from a URL
*/
function getPath(req: express.Request): {script: string; prefix: string; dad: string} {
	// create a valid url
	const validUrl = `${req.protocol}://${os.hostname()}${req.originalUrl}`;

	// get the pathname from the url (new URL('https://example.org/abc/xyz?123').pathname => /abc/xyz)
	const pathname = new URL(validUrl).pathname;

	const tmp = trimPath(pathname.substr(0, pathname.lastIndexOf('/') + 1));
	const script = `/${tmp}`;
	const prefix = `/${tmp.substr(0, tmp.lastIndexOf('/'))}`;
	const dad = tmp.substr(tmp.indexOf('/') + 1);

	return {script,	prefix, dad};
}

/*
* Get a path that is not enclodes in slashes
*/
function trimPath(value: string): string {
	return value.replace(/^\/+|\/+$/g, '');
}
