import {assert, describe, it} from 'vitest';
import os from 'node:os';
import {getCGI} from './cgi.ts';
import type {Request} from 'express';

describe('cgi', () => {
	it('with a proper configuration object and request', () => {
		const PORT = 4711;
		const ORIGINAL_URL = '/pls/base/package.procedure?p=1#1';
		const DOCUMENT_TABLE_NAME = 'doc-table';
		const REMOTE_ADDRESS = '127.0.0.1';

		const get = (name: string) => {
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
					return;
			}
		};

		const req = {
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
		} as unknown as Request;

		const cgi = getCGI(req, DOCUMENT_TABLE_NAME, {});

		assert.strictEqual(Object.keys(cgi).length, 30);

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
			AUTH_TYPE: '',
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
			// eslint-disable-next-line unicorn/text-encoding-identifier-case
			REQUEST_CHARSET: 'UTF8',
			// eslint-disable-next-line unicorn/text-encoding-identifier-case
			REQUEST_IANA_CHARSET: 'UTF-8',
			SCRIPT_PREFIX: '/pls',
			HTTP_COOKIE: 'cookie1=value1;cookie2=value2;',
		});
	});

	it('with authenticated user', () => {
		const req = {
			protocol: 'http',
			originalUrl: '/pls/base/proc',
			method: 'GET',
			params: {name: 'proc'},
			httpVersion: '1.1',
			get: () => '',
			cookies: {},
			socket: {localPort: 80},
		} as unknown as Request;

		const cgi = getCGI(req, 'table', {}, 'TEST_USER');

		assert.strictEqual(cgi.REMOTE_USER, 'TEST_USER');
		assert.strictEqual(cgi.AUTH_TYPE, 'Basic');
	});

	it('with minimal configuration to cover fallback branches', () => {
		const req = {
			protocol: undefined, // Test undefined protocol
			originalUrl: '/pls/dad/proc',
			method: 'POST',
			params: {
				name: ['proc'], // Test array params
			},
			httpVersion: '1.0',
			ip: undefined, // Test undefined IP

			get: (_name: any) => undefined, // Test undefined headers
			cookies: {},
			connection: {},
			socket: {
				localPort: undefined, // Test undefined port
			},
		} as unknown as Request;

		const cgi = getCGI(req, '', {});

		assert.strictEqual(cgi.SERVER_PORT, '');
		assert.strictEqual(cgi.REQUEST_PROTOCOL, '');
		assert.strictEqual(cgi.REMOTE_ADDR, '');
		assert.strictEqual(cgi.PATH_INFO, 'proc');
		assert.strictEqual(cgi.HTTP_USER_AGENT, '');
		assert.strictEqual(cgi.HTTP_HOST, '');
	});
});
