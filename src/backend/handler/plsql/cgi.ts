/*
 *	Prepare the CGI information
 */

import os from 'node:os';
import {URL} from 'node:url';
import debugModule from 'debug';
const debug = debugModule('webplsql:cgi');

import type {Request} from 'express';
import type {environmentType} from '../../types.ts';

const DEFAULT_CGI: environmentType = {
	PLSQL_GATEWAY: 'WebDb',
	GATEWAY_IVERSION: '2',
	SERVER_SOFTWARE: 'web_plsql',
	GATEWAY_INTERFACE: 'CGI/1.1',
	SERVER_PORT: '',
	SERVER_NAME: os.hostname(),
	REQUEST_METHOD: '',
	PATH_INFO: '',
	SCRIPT_NAME: '',
	REMOTE_ADDR: '',
	SERVER_PROTOCOL: '',
	REQUEST_PROTOCOL: '',
	REMOTE_USER: '',
	HTTP_COOKIE: '',
	HTTP_USER_AGENT: '',
	HTTP_HOST: '',
	HTTP_ACCEPT: '',
	HTTP_ACCEPT_ENCODING: '',
	HTTP_ACCEPT_LANGUAGE: '',
	HTTP_REFERER: '',
	HTTP_X_FORWARDED_FOR: '',
	WEB_AUTHENT_PREFIX: '',
	DAD_NAME: '',
	DOC_ACCESS_PATH: 'doc',
	DOCUMENT_TABLE: '',
	PATH_ALIAS: '',
	REQUEST_CHARSET: 'UTF8',
	REQUEST_IANA_CHARSET: 'UTF-8',
	SCRIPT_PREFIX: '',
};

/**
 * Create the HTTP_COOKIE string
 *
 * @param req - The req object represents the HTTP request.
 * @returns The string representation of the cookies.
 */
const getCookieString = (req: Request): string => {
	let cookieString = '';

	for (const propName in req.cookies) {
		cookieString += `${propName}=${req.cookies[propName]};`;
	}

	debug('getCookieString', req.cookies, cookieString);

	return cookieString;
};

/**
 * Get the script name and DAD name from a URL
 *
 * @param req - The req object represents the HTTP request.
 * @returns The DAD structure.
 */
const getPath = (req: Request): {script: string; prefix: string; dad: string} => {
	// create a valid url
	const validUrl = `${req.protocol}://${os.hostname()}${req.originalUrl}`;

	// get the pathname from the url (new URL('https://example.org/abc/xyz?123').pathname => /abc/xyz)
	const pathname = new URL(validUrl).pathname;

	const tmp = trimPath(pathname.substring(0, pathname.lastIndexOf('/') + 1));
	const script = `/${tmp}`;
	const prefix = `/${tmp.substring(0, tmp.lastIndexOf('/'))}`;
	const dad = tmp.substring(tmp.indexOf('/') + 1);

	return {script, prefix, dad};
};

/**
 * Get a path that is not enclodes in slashes
 *
 * @param value - The value to trim.
 * @returns The trimmed value.
 */
const trimPath = (value: string): string => value.replace(/^\/+|\/+$/g, '');

/**
 * Create a CGI object
 *
 * @param req - The req object represents the HTTP request.
 * @param doctable - The document table.
 * @param cgi - The additional cgi.
 * @returns CGI object
 */
export const getCGI = (req: Request, doctable: string, cgi: environmentType): environmentType => {
	const PROTOCOL = req.protocol ? req.protocol.toUpperCase() : '';
	const PATH = getPath(req);

	const CGI: environmentType = {
		SERVER_PORT: typeof req.socket.localPort === 'number' ? req.socket.localPort.toString() : '',
		REQUEST_METHOD: req.method,
		PATH_INFO: Array.isArray(req.params.name) ? (req.params.name[0] ?? '') : (req.params.name ?? ''),
		SCRIPT_NAME: PATH.script,
		REMOTE_ADDR: (req.ip ?? '').replace('::ffff:', ''),
		SERVER_PROTOCOL: `${PROTOCOL}/${req.httpVersion}`,
		REQUEST_PROTOCOL: PROTOCOL,
		HTTP_COOKIE: getCookieString(req),
		HTTP_USER_AGENT: req.get('user-agent') ?? '',
		HTTP_HOST: req.get('host') ?? '',
		HTTP_ACCEPT: req.get('accept') ?? '',
		HTTP_ACCEPT_ENCODING: req.get('accept-encoding') ?? '',
		HTTP_ACCEPT_LANGUAGE: req.get('accept-language') ?? '',
		HTTP_REFERER: req.get('referer') ?? '',
		HTTP_X_FORWARDED_FOR: req.get('x-forwarded-for') ?? '',
		DAD_NAME: PATH.dad,
		DOCUMENT_TABLE: doctable,
		SCRIPT_PREFIX: PATH.prefix,
	};

	return Object.assign({}, DEFAULT_CGI, CGI, cgi);
};
