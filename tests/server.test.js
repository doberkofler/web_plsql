/* eslint-disable @typescript-eslint/no-misused-promises */

import assert from 'node:assert';
import {describe, it, before, after, beforeEach} from 'node:test';
import util from 'node:util';
import path from 'node:path';
import express from 'express';
import bodyParser from 'body-parser';
// @ts-expect-error type definition missing
import multipart from 'connect-multiparty';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import request from 'supertest';
import * as oracledb from './mock/oracledb.js';
import webplsql from '../src/index.js';

const PORT = 8765;
const PATH = '/base';
const DEFAULT_PAGE = 'sample.pageIndex';
const DOC_TABLE = 'docTable';

/**
 * @typedef {import('../src/types.js').BindParameterConfig} BindParameterConfig
 * @typedef {import('../src/types.js').middlewareOptions} middlewareOptions
 * @typedef {{name: string, value: string | string[]}[]} paraType
 */

/**
 * File upload metadata
 * @typedef {object} serverConfigType
 * @property {import('express').Express} app
 * @property {import('node:http').Server} server
 * @property {oracledb.Pool} connectionPool
 */

describe('server utilities', () => {
	it('should start a server', async () => {
		const serverConfig = await serverStart();

		assert.strictEqual(Object.prototype.toString.call(serverConfig), '[object Object]');
		assert.strictEqual(Object.prototype.toString.call(serverConfig.server), '[object Object]');

		await serverStop(serverConfig);
	});
});

describe('server static', () => {
	/** @type {serverConfigType} */
	let serverConfig;

	before(async () => {
		serverConfig = await serverStart();
	});

	after(async () => {
		await serverStop(serverConfig);
	});

	beforeEach(() => {
		oracledb.setExecuteCallback();
	});

	it('get a static file', async () => {
		const response = await request(serverConfig.app).get('/static/static.html');
		assert.strictEqual(response.status, 200);
		assert.strictEqual(response.text, '<html>\n\t<body>\n\t\t<p>static</p>\n\t</body>\n</html>\n');
	});

	it('report a 404 error on a missing static file', async () => {
		const response = await request(serverConfig.app).get('/static/file_does_not_exist.html');
		assert.strictEqual(response.status, 404);
		assert.strictEqual(
			response.text,
			'<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot GET /static/file_does_not_exist.html</pre>\n</body>\n</html>\n',
		);
	});

	it('get default page', async () => {
		const response = await request(serverConfig.app).get(PATH);
		assert.strictEqual(response.status, 302);
		assert.strictEqual(response.text, `Found. Redirecting to ${PATH}/${DEFAULT_PAGE}`);
	});

	it('get page', async () => {
		sqlExecuteProxy({
			proc: 'sample.pageIndex();',
			lines: [
				'Content-type: text/html; charset=UTF-8\n',
				'X-ORACLE-IGNORE:  IGNORE\n',
				'Custom-header:  important\n',
				'\n',
				'<html><body><p>static</p></body></html>\n',
			],
		});

		const response = await request(serverConfig.app).get(`${PATH}/${DEFAULT_PAGE}`);
		assert.strictEqual(response.status, 200);
		assert.match(response.text, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	/*

	it('get page with query string', () => {
		sqlExecuteProxy({
			proc: 'sample.pageIndex(a=>:p_a,b=>:p_b);',
			para: [
				{name: 'a', value: '1'},
				{name: 'b', value: '2'},
			],
			lines: ['Content-type: text/html; charset=UTF-8\n', '\n', '<html><body><p>static</p></body></html>\n'],
		});

		return request(serverConfig.app).get(`${PATH}/${DEFAULT_PAGE}?a=1&b=2`).expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	it('get page with query string containing duplicate names', () => {
		sqlExecuteProxy({
			proc: 'sample.pageIndex(a=>:p_a);',
			para: [{name: 'a', value: ['1', '2']}],
			lines: ['Content-type: text/html; charset=UTF-8\n', '\n', '<html><body><p>static</p></body></html>\n'],
		});

		return request(serverConfig.app).get(`${PATH}/${DEFAULT_PAGE}?a=1&a=2`).expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	it('get page with flexible parameters', () => {
		sqlExecuteProxy({
			proc: 'sample.pageIndex(:argnames, :argvalues);',
			para: [
				{name: 'argnames', value: ['a', 'b']},
				{name: 'argvalues', value: ['1', '2']},
			],
			lines: ['Content-type: text/html; charset=UTF-8\n', '\n', '<html><body><p>static</p></body></html>\n'],
		});

		return request(serverConfig.app).get(`${PATH}/!${DEFAULT_PAGE}?a=1&b=2`).expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	it('get page with cookies', () => {
		sqlExecuteProxy({
			proc: 'sample.pageIndex();',
			lines: [
				'Content-type: text/html; charset=UTF-8\n',
				'Set-Cookie: C1=V1; path=/apex; Domain=mozilla.org; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Secure; HttpOnly\n',
				'\n',
				'<html><body><p>static</p></body></html>\n',
			],
		});

		return request(serverConfig.app)
			.get(`${PATH}/${DEFAULT_PAGE}`)
			.expect(200)
			.expect('set-cookie', 'C1=V1; Domain=mozilla.org; Path=/apex; Expires=Wed, 21 Oct 2015 07:28:00 GMT; HttpOnly')
			.expect(new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	it('redirect to a new url', () => {
		sqlExecuteProxy({
			proc: 'sample.pageIndex();',
			lines: ['Location: www.google.com\n'],
		});

		return request(serverConfig.app).get(`${PATH}/${DEFAULT_PAGE}`).expect(302);
	});

	it('get json', () => {
		sqlExecuteProxy({
			proc: 'sample.pageJson();',
			lines: ['Content-type: application/json\n', '\n', '{"name":"johndoe"}'],
		});

		return request(serverConfig.app).get(`${PATH}/sample.pageJson`).expect(200, '{"name":"johndoe"}');
	});

	it('get application/x-www-form-urlencoded', () => {
		sqlExecuteProxy({
			proc: 'sample.pageForm(name=>:p_name);',
			para: [{name: 'name', value: 'johndoe'}],
			lines: ['Content-Type: text/html\n', '\n', '<html><body><p>static</p></body></html>\n'],
		});

		return request(serverConfig.app)
			.get(`${PATH}/sample.pageForm`)
			.set('Content-Type', 'application/x-www-form-urlencoded')
			.send('name=johndoe')
			.expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	it('get application/x-www-form-urlencoded with file', () => {
		sqlExecuteProxy({
			proc: 'sample.pageForm(',
			para: [{name: 'user_name', value: 'Tobi'}],
			lines: ['Content-Type: text/html\n', '\n', '<html><body><p>static</p></body></html>\n'],
		});

		const test = request(serverConfig.app).post(`${PATH}/sample.pageForm`);
		test.set('Content-Type', 'multipart/form-data; boundary=foo');
		test.write('--foo\r\n');
		test.write('Content-Disposition: form-data; name="user_name"\r\n');
		test.write('\r\n');
		test.write('Tobi');
		test.write('\r\n--foo\r\n');
		test.write('Content-Disposition: form-data; name="text"; filename="test/server.js"\r\n');
		test.write('\r\n');
		test.write('some text here');
		test.write('\r\n--foo--');

		return test.expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	it('set status', () => {
		sqlExecuteProxy({
			proc: 'sample.pageIndex();',
			lines: ['Status: 302 status\n'],
		});

		return request(serverConfig.app).get(`${PATH}/${DEFAULT_PAGE}`).expect(302);
	});

	it('set x-db-content-length header', () => {
		sqlExecuteProxy({
			proc: 'sample.pageJson();',
			lines: ['x-db-content-length: 0\n'],
		});

		return request(serverConfig.app).get(`${PATH}/sample.pageJson`).expect(200);
	});

	it('use the pathAlias configuration setting', () => {
		sqlExecuteProxy({
			proc: 'pathAlias(p_path=>:p_path);',
			lines: ['Content-type: text/html; charset=UTF-8\n', '\n', '<html><body><p>static</p></body></html>\n'],
		});

		return request(serverConfig.app).get(`${PATH}/alias`).expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	*/

	/*	EVEN BEFORE

	it('GET /sampleRoute/cgi should validate the cgi', () => {
		request(application.expressApplication).get('/sampleRoute/cgi')
			.expect(200, 'cgi', done);
	});

	it('GET /basicRoute/basicPage should generate a 401 error', () => {
		request(application.expressApplication)
			.get('/basicRoute/basicPage')
			.expect(401, 'Access denied', done);
	});

	it('GET /basicRoute/basicPage should authorize', () => {
		request(application.expressApplication)
			.get('/basicRoute/basicPage')
			.auth('myusername', 'mypassword')
			.expect(200, done);
	});

	it('should upload files', () => {
		const FILENAME = 'temp/index.html';
		const CONTENT = 'content of index.html';
		let test;

		// create a static file
		mkdirp.sync('temp');
		fs.writeFileSync(FILENAME, CONTENT);

		// test the upload
		test = request(application.expressApplication).post('/sampleRoute/fileUpload');
		test.attach('file', FILENAME);
		test.expect(200, done);
	});

	it('should respond with 404', () => {
		let test = request(application.expressApplication).get('/invalidRoute');

		test.expect(404, new RegExp('.*404 Not Found.*'), done);
	});

	it('should respond with 404', () => {
		let test = request(application.expressApplication).get('/sampleRoute/errorInPLSQL');

		test.expect(404, new RegExp('.*Failed to parse target procedure.*'), done);
	});

	it('should respond with 500', () => {
		let test = request(application.expressApplication).get('/sampleRoute/internalError');

		test.expect(500, done);
	});

	it('does stop', () => {
		server.stop(application, () => {
			application = null;
			assert.ok(true);
			done();
		});
	});


	it('does not start', () => {
		server.start().then(() => {
		}, function (err) {
			assert.strictEqual(err, 'Configuration object must be an object');
			done();
		});
	});

	*/
});

/**
 *	Start server
 *	@returns {Promise<serverConfigType>} - The server configuration
 */
async function serverStart() {
	const connectionPool = await oracledb.createPool({
		user: 'sample',
		password: 'sample',
		connectString: 'localhost:1521/TEST',
	});

	// create express app
	const app = express();

	// add middleware
	app.use(multipart());
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(cookieParser());
	app.use(compression());

	// add the oracle pl/sql express middleware
	/** @type {Partial<middlewareOptions>} */
	const options = {
		trace: 'off',
		defaultPage: DEFAULT_PAGE,
		doctable: DOC_TABLE,
		pathAlias: {
			alias: 'alias',
			procedure: 'pathAlias',
		},
	};
	//@ts-expect-error NOTE: the connection pool is mocked and cannot have the proper type
	app.use(`${PATH}/:name?`, webplsql(connectionPool, options));

	// serving static files
	const staticResourcesPath = path.join(process.cwd(), 'tests', 'static');
	app.use('/static', express.static(staticResourcesPath));

	// listen
	return new Promise((resolve) => {
		const server = app.listen(PORT, () => {
			resolve({
				app,
				server,
				connectionPool,
			});
		});
	});
}

/**
 *	Stop server.
 *	@param {serverConfigType} config - The server configuration.
 */
async function serverStop(config) {
	config.server.close();
	await config.connectionPool.close(0);
}

/**
 *	Set the proxy for the next sql procedure to be executed
 *	@param {{proc: string; para?: paraType; lines: string[]}} config - The configuration.
 */
function sqlExecuteProxy(config) {
	/**
	 *	Proxy for the next sql procedure to be executed
	 *	@param {string} sql - The SQL statement.
	 *	@param {BindParameterConfig} bind - The bind object.
	 *	@returns {unknown} - The result of the proxy.
	 */
	const sqlExecuteProxyCallback = (sql, bind) => {
		if (sql.includes('dbms_utility.name_resolve')) {
			/** @type {{outBinds: {names: string[], types: string[]}}} */
			const noPara = {
				outBinds: {
					names: [],
					types: [],
				},
			};

			return typeof config.para === 'undefined'
				? noPara
				: config.para.reduce((accumulator, currentValue) => {
						accumulator.outBinds.names.push(currentValue.name);
						accumulator.outBinds.types.push('VARCHAR2');
						return accumulator;
					}, noPara);
		}

		if (sql.includes(config.proc)) {
			if (typeof config.para !== 'undefined') {
				if (!parameterEqual(sql, bind, config.para)) {
					console.error(`===> Parameter mismatch\n${'-'.repeat(30)}\n${util.inspect(bind)}\n${'-'.repeat(30)}`);
					return {};
				}
			}

			return {
				outBinds: {
					fileType: null,
					fileSize: null,
					fileBlob: null,
					fileExist: 0,
					lines: config.lines,
					irows: config.lines.length,
				},
			};
		}

		if (sql.startsWith('INSERT INTO')) {
			return {
				rowsAffected: 1,
			};
		}

		console.error(`===> sql statement cannot be identified\n${'-'.repeat(30)}\n${sql}\n${'-'.repeat(30)}`);

		return {};
	};

	// @ts-expect-error FIXME: do not understand!
	oracledb.setExecuteCallback(sqlExecuteProxyCallback);
}

/**
 * Compare parameters
 * @param {string} sql - The SQL statement.
 * @param {BindParameterConfig} bind - The bind object.
 * @param {paraType} parameters - The parameters.
 * @returns {boolean} - The result of the comparison.
 */
function parameterEqual(sql, bind, parameters) {
	return !sql.includes('(:argnames, :argvalues)') ? parameterFixedEqual(bind, parameters) : parameterFlexibleEqual(bind, parameters);
}

/**
 * Compare parameters with fixed names
 * @param {BindParameterConfig} bind - The bind object.
 * @param {paraType} parameters - The parameters.
 * @returns {boolean} - The result of the comparison.
 */
function parameterFixedEqual(bind, parameters) {
	return parameters.every((para) => {
		if (!(`p_${para.name}` in bind)) {
			console.error(`===> The parameter "${para.name}" is missing`);
			return false;
		}

		if (Array.isArray(para.value)) {
			return para.value.every((v, i) => {
				const equal = v === bind[`p_${para.name}`].val[i];
				if (!equal) {
					console.error(`===> The value "${v}" of parameter "${para.name}" is different`);
				}
				return equal;
			});
		}

		return para.value === bind[`p_${para.name}`].val;
	});
}

/**
 * Compare parameters with flexible names
 * @param {BindParameterConfig} bind - The bind object.
 * @param {paraType} parameters - The parameters.
 * @returns {boolean} - The result of the comparison.
 */
function parameterFlexibleEqual(bind, parameters) {
	if (parameters.length !== 2) {
		console.error('===> Invalid number of parameters');
		return false;
	}

	if (!parameters.every((para) => ['argnames', 'argvalues'].includes(para.name))) {
		console.error('===> Invalid parameter names');
		return false;
	}

	if (!('argnames' in bind) || !('argvalues' in bind)) {
		console.error('===> Missing bindings');
		return false;
	}

	return parameters.every((para) => Array.isArray(para.value) && arrayEqual(para.value, bind[para.name].val));
}

/**
 *	Compare two arrays
 *	@param {unknown[]} array1 - The first array.
 *	@param {unknown[]} array2 - The second array.
 *	@returns {boolean} - The result of the comparison.
 */
function arrayEqual(array1, array2) {
	if (!array1 || !array2) {
		return false;
	}

	if (array1.length !== array2.length) {
		return false;
	}

	return array1.every((e, i) => e === array2[i]);
}
