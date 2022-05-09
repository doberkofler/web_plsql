import {describe, beforeAll, afterAll, beforeEach, it, expect} from '@jest/globals';
import util from 'util';
import express from 'express';
import http from 'http';
import oracledb from 'oracledb';
import path from 'path';
import bodyParser from 'body-parser';
// @ts-expect-error
import multipart from 'connect-multiparty';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import request from 'supertest';
import {setExecuteCallback, createPool} from '../mock/oracledb';

const webplsql = require('../../src/index'); // eslint-disable-line @typescript-eslint/no-var-requires

const PORT = 8765;
const PATH = '/base';
const DEFAULT_PAGE = 'sample.pageIndex';
const DOC_TABLE = 'docTable';

type serverConfigType = {
	app: express.Application;
	server: http.Server;
	connectionPool: oracledb.Pool;
}

describe('server utilities', () => {
	it('should start a server', async () => {
		const serverConfig = await serverStart();

		expect(Object.prototype.toString.call(serverConfig)).toBe('[object Object]');
		expect(Object.prototype.toString.call(serverConfig.app.listen)).toBe('[object Function]');
		expect(Object.prototype.toString.call(serverConfig.server)).toBe('[object Object]');
		//expect(serverConfig.connectionPool).toBeInstanceOf(oracledb.Pool);

		await serverStop(serverConfig);
	});
});

describe('server static', () => {
	let serverConfig: any;

	beforeAll(async () => {
		serverConfig = await serverStart();
	});

	afterAll(async () => {
		await serverStop(serverConfig);
	});

	beforeEach(() => {
		setExecuteCallback();
	});

	it('get a static file', () =>
		request(serverConfig.app).get('/static/static.html')
			.expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*')));

	it('report a 404 error on a missing static file', () =>
		request(serverConfig.app).get('/static/file_does_not_exist.html')
			.expect(404));

	it('get default page', () =>
		request(serverConfig.app).get(PATH)
			.expect(302, `Found. Redirecting to ${PATH}/${DEFAULT_PAGE}`));

	it('get page', () => {
		sqlExecuteProxy({
			proc: 'sample.pageIndex();',
			lines: [
				'Content-type: text/html; charset=UTF-8\n',
				'X-ORACLE-IGNORE:  IGNORE\n',
				'Custom-header:  important\n',
				'\n',
				'<html><body><p>static</p></body></html>\n'
			]
		});

		return request(serverConfig.app).get(`${PATH}/${DEFAULT_PAGE}`)
			.expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	it('get page with query string', () => {
		sqlExecuteProxy({
			proc: 'sample.pageIndex(a=>:p_a,b=>:p_b);',
			para: [
				{name: 'a', value: '1'},
				{name: 'b', value: '2'}
			],
			lines: [
				'Content-type: text/html; charset=UTF-8\n',
				'\n',
				'<html><body><p>static</p></body></html>\n'
			]
		});

		return request(serverConfig.app).get(`${PATH}/${DEFAULT_PAGE}?a=1&b=2`)
			.expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	it('get page with query string containing duplicate names', () => {
		sqlExecuteProxy({
			proc: 'sample.pageIndex(a=>:p_a);',
			para: [
				{name: 'a', value: ['1', '2']}
			],
			lines: [
				'Content-type: text/html; charset=UTF-8\n',
				'\n',
				'<html><body><p>static</p></body></html>\n'
			]
		});

		return request(serverConfig.app).get(`${PATH}/${DEFAULT_PAGE}?a=1&a=2`)
			.expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	it('get page with flexible parameters', () => {
		sqlExecuteProxy({
			proc: 'sample.pageIndex(:argnames, :argvalues);',
			para: [
				{name: 'argnames', value: ['a', 'b']},
				{name: 'argvalues', value: ['1', '2']}
			],
			lines: [
				'Content-type: text/html; charset=UTF-8\n',
				'\n',
				'<html><body><p>static</p></body></html>\n'
			]
		});

		return request(serverConfig.app).get(`${PATH}/!${DEFAULT_PAGE}?a=1&b=2`)
			.expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	it('get page with cookies', () => {
		sqlExecuteProxy({
			proc: 'sample.pageIndex();',
			lines: [
				'Content-type: text/html; charset=UTF-8\n',
				'Set-Cookie: C1=V1; path=/apex; Domain=mozilla.org; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Secure; HttpOnly\n',
				'\n',
				'<html><body><p>static</p></body></html>\n'
			]
		});

		return request(serverConfig.app).get(`${PATH}/${DEFAULT_PAGE}`)
			.expect(200)
			.expect('set-cookie', 'C1=V1; Domain=mozilla.org; Path=/apex; Expires=Wed, 21 Oct 2015 07:28:00 GMT; HttpOnly')
			.expect(new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	it('redirect to a new url', () => {
		sqlExecuteProxy({
			proc: 'sample.pageIndex();',
			lines: ['Location: www.google.com\n']
		});

		return request(serverConfig.app).get(`${PATH}/${DEFAULT_PAGE}`)
			.expect(302);
	});

	it('get json', () => {
		sqlExecuteProxy({
			proc: 'sample.pageJson();',
			lines: [
				'Content-type: application/json\n',
				'\n',
				'{"name":"johndoe"}'
			]
		});

		return request(serverConfig.app).get(`${PATH}/sample.pageJson`)
			.expect(200, '{"name":"johndoe"}');
	});

	it('get application/x-www-form-urlencoded', () => {
		sqlExecuteProxy({
			proc: 'sample.pageForm(name=>:p_name);',
			para: [
				{name: 'name', value: 'johndoe'}
			],
			lines: [
				'Content-Type: text/html\n',
				'\n',
				'<html><body><p>static</p></body></html>\n'
			]
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
			para: [
				{name: 'user_name', value: 'Tobi'}
			],
			lines: [
				'Content-Type: text/html\n',
				'\n',
				'<html><body><p>static</p></body></html>\n'
			]
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
			lines: [
				'Status: 302 status\n'
			]
		});

		return request(serverConfig.app).get(`${PATH}/${DEFAULT_PAGE}`)
			.expect(302);
	});

	it('set x-db-content-length header', () => {
		sqlExecuteProxy({
			proc: 'sample.pageJson();',
			lines: [
				'x-db-content-length: 0\n',
			]
		});

		return request(serverConfig.app).get(`${PATH}/sample.pageJson`)
			.expect(200);
	});

	it('use the pathAlias configuration setting', () => {
		sqlExecuteProxy({
			proc: 'pathAlias(p_path=>:p_path);',
			lines: [
				'Content-type: text/html; charset=UTF-8\n',
				'\n',
				'<html><body><p>static</p></body></html>\n'
			]
		});

		return request(serverConfig.app).get(`${PATH}/alias`)
			.expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	/*

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

/*
*	Start server
*/
async function serverStart(): Promise<serverConfigType> {
	// create connection pool
	const connectionPool = await createPool({
		user: 'sample',
		password: 'sample',
		connectString: 'localhost:1521/TEST'
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
	app.use(PATH + '/:name?', webplsql(connectionPool, {
		trace: 'test',
		defaultPage: DEFAULT_PAGE,
		doctable: DOC_TABLE,
		pathAlias: {
			alias: 'alias',
			procedure: 'pathAlias'
		}
	}));

	// serving static files
	const staticResourcesPath = path.join(process.cwd(), 'test', 'static');
	app.use('/static', express.static(staticResourcesPath));

	// listen on port
	const server = app.listen(PORT);

	return {app, server, connectionPool: connectionPool as unknown as oracledb.Pool};
}

/*
*	Stop server
*/
async function serverStop(config: serverConfigType) {
	await config.server.close();
	await config.connectionPool.close();
}

/*
*	Set the proxy for the next sql procedure to be executed
*/
function sqlExecuteProxy(config: {proc: string; para?: Array<{name: string; value: string | Array<string>}>; lines: Array<string>}) {
	setExecuteCallback((sql: string, bind: any) => {
		if (sql.indexOf('dbms_utility.name_resolve') !== -1) {
			const noPara: {outBinds: {names: Array<string>; types: Array<string>}} = {
				outBinds: {
					names: [],
					types: []
				}
			};

			return typeof config.para === 'undefined' ? noPara : config.para.reduce((accumulator, currentValue) => {
				accumulator.outBinds.names.push(currentValue.name);
				accumulator.outBinds.types.push('VARCHAR2');
				return accumulator;
			}, noPara);
		}

		if (sql.indexOf(config.proc) !== -1) {
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
					lines: config.lines,
					irows: config.lines.length
				}
			};
		}

		if (sql.indexOf('INSERT INTO') === 0) {
			return {
				rowsAffected: 1
			};
		}

		console.error(`===> sql statement cannot be identified\n${'-'.repeat(30)}\n${sql}\n${'-'.repeat(30)}`);

		return {};
	});
}

function parameterEqual(sql: string, bind: any, parameters: Array<{name: string; value: string | Array<string>}>): boolean {
	return sql.indexOf('(:argnames, :argvalues)') === -1 ? parameterFixedEqual(bind, parameters) : parameterFlexibleEqual(bind, parameters);
}

function parameterFixedEqual(bind: any, parameters: Array<{name: string; value: string | Array<string>}>): boolean {
	return parameters.every(para => {
		if (!bind.hasOwnProperty('p_' + para.name)) {
			console.error(`===> The parameter "${para.name}" is missing`);
			return false;
		}

		if (Array.isArray(para.value)) {
			return para.value.every((v, i) => {
				const equal = v === bind['p_' + para.name].val[i];
				if (!equal) {
					console.error(`===> The value "${v}" of parameter "${para.name}" is different`);
				}
				return equal;
			});
		}

		return para.value === bind['p_' + para.name].val;
	});
}

function parameterFlexibleEqual(bind: any, parameters: Array<{name: string; value: string | Array<string>}>): boolean {
	if (parameters.length !== 2) {
		console.error('===> Invalid number of parameters');
		return false;
	}

	if (!parameters.every(para => ['argnames', 'argvalues'].indexOf(para.name) !== -1)) {
		console.error('===> Invalid parameter names');
		return false;
	}

	if (!bind.hasOwnProperty('argnames') || !bind.hasOwnProperty('argvalues')) {
		console.error('===> Missing bindings');
		return false;
	}

	return parameters.every(para => Array.isArray(para.value) && arrayEqual(para.value, bind[para.name].val));
}

/*
*	Compare two arrays
*/
function arrayEqual(array1: Array<any>, array2: Array<any>): boolean {
	if (!array1 || !array2) {
		return false;
	}

	if (array1.length !== array2.length) {
		return false;
	}

	return array1.every((e, i) => e === array2[i]);
}
