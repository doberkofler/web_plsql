import assert from 'node:assert';
import {describe, it} from 'node:test';
import os from 'node:os';
import {getCGI} from '../src/cgi.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('../src/types.js').configPlSqlType} configPlSqlType
 */

describe('cgi', () => {
	it('with a proper configuration object and request', () => {
		const PORT = 4711;
		const ORIGINAL_URL = '/pls/base/package.procedure?p=1#1';
		const DOCUMENT_TABLE_NAME = 'doc-table';
		const REMOTE_ADDRESS = '127.0.0.1';

		/**
		 * @param {string} name
		 */
		const get = (name) => {
			switch (name.toLowerCase()) {
				case 'port':
					return PORT.toString();
				case 'host':
					return 'HOST';
				case 'user-agent':
					return 'USER-AGENT';
				case 'accept':
					return 'ACCEPT';
				case 'accept-encoding':
					return 'ACCEPT-ENCODING';
				case 'accept-language':
					return 'ACCEPT-LANGUAGE';
				case 'referer':
				case 'referrer':
					return 'HTTP-REFERER';
				default:
					return null;
			}
		};

		const req = /** @type {Request} */ (
			/** @type {unknown} */ ({
				protocol: 'http',
				originalUrl: ORIGINAL_URL,
				method: 'GET',
				params: {
					name: 'index.html',
				},
				httpVersion: '1.1',
				ip: REMOTE_ADDRESS,
				get,
				cookies: {
					cookie1: 'value1',
					cookie2: 'value2',
				},
				connection: {
					remoteAddress: REMOTE_ADDRESS,
				},
				socket: {
					localPort: PORT,
				},
			})
		);

		const cgi = getCGI(req, DOCUMENT_TABLE_NAME, {});

		assert.strictEqual(Object.keys(cgi).length, 29);

		assert.deepStrictEqual(cgi, {
			PLSQL_GATEWAY: 'WebDb',
			GATEWAY_IVERSION: '2',
			SERVER_SOFTWARE: 'web_plsql',
			GATEWAY_INTERFACE: 'CGI/1.1',
			SERVER_PORT: PORT.toString(),
			SERVER_NAME: os.hostname(),
			REQUEST_METHOD: 'GET',
			PATH_INFO: 'index.html',
			SCRIPT_NAME: '/pls/base',
			REMOTE_ADDR: REMOTE_ADDRESS,
			SERVER_PROTOCOL: 'HTTP/1.1',
			REQUEST_PROTOCOL: 'HTTP',
			REMOTE_USER: '',
			HTTP_USER_AGENT: 'USER-AGENT',
			HTTP_X_FORWARDED_FOR: '',
			HTTP_HOST: 'HOST',
			HTTP_ACCEPT: 'ACCEPT',
			HTTP_ACCEPT_ENCODING: 'ACCEPT-ENCODING',
			HTTP_ACCEPT_LANGUAGE: 'ACCEPT-LANGUAGE',
			HTTP_REFERER: 'HTTP-REFERER',
			WEB_AUTHENT_PREFIX: '',
			DAD_NAME: 'base',
			DOC_ACCESS_PATH: 'doc',
			DOCUMENT_TABLE: DOCUMENT_TABLE_NAME,
			PATH_ALIAS: '',
			REQUEST_CHARSET: 'UTF8',
			REQUEST_IANA_CHARSET: 'UTF-8',
			SCRIPT_PREFIX: '/pls',
			HTTP_COOKIE: 'cookie1=value1;cookie2=value2;',
		});
	});
});
