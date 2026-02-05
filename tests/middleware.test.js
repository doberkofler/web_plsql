import {assert, describe, it, beforeAll, afterAll, beforeEach, vi} from 'vitest';
import request from 'supertest';
import * as oracledb from './mock/oracledb.js';
import {serverStart, serverStop, sqlExecuteProxy, PATH, DEFAULT_PAGE} from './server.js';

/** @typedef {import('./server.js').serverConfigType} serverConfigType */

// Mock console.warn
vi.spyOn(console, 'warn').mockImplementation(() => {
	/* mock implementation */
});

describe('middleware', () => {
	/** @type {serverConfigType} */
	let serverConfig;

	beforeAll(async () => {
		serverConfig = await serverStart();
	});

	afterAll(async () => {
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

		await request(serverConfig.app).get(`${PATH}/${DEFAULT_PAGE}`).expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	it('get page with query string', async () => {
		sqlExecuteProxy({
			proc: 'sample.pageIndex(a=>:p_a, b=>:p_b);',
			para: [
				{name: 'a', value: '1'},
				{name: 'b', value: '2'},
			],
			lines: ['Content-type: text/html; charset=UTF-8\n', '\n', '<html><body><p>static</p></body></html>\n'],
		});

		await request(serverConfig.app).get(`${PATH}/${DEFAULT_PAGE}?a=1&b=2`).expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	it('get page with query string containing duplicate names', async () => {
		sqlExecuteProxy({
			proc: 'sample.pageIndex(a=>:p_a);',
			para: [{name: 'a', value: ['1', '2']}],
			lines: ['Content-type: text/html; charset=UTF-8\n', '\n', '<html><body><p>static</p></body></html>\n'],
		});

		await request(serverConfig.app).get(`${PATH}/${DEFAULT_PAGE}?a=1&a=2`).expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	it('get page with flexible parameters', async () => {
		sqlExecuteProxy({
			proc: 'sample.pageIndex(:argnames, :argvalues);',
			para: [
				{name: 'argnames', value: ['a', 'b']},
				{name: 'argvalues', value: ['1', '2']},
			],
			lines: ['Content-type: text/html; charset=UTF-8\n', '\n', '<html><body><p>static</p></body></html>\n'],
		});

		await request(serverConfig.app).get(`${PATH}/!${DEFAULT_PAGE}?a=1&b=2`).expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	it('get page with cookies', async () => {
		sqlExecuteProxy({
			proc: 'sample.pageIndex();',
			lines: [
				'Content-type: text/html; charset=UTF-8\n',
				'Set-Cookie: C1=V1; path=/apex; Domain=mozilla.org; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Secure; HttpOnly\n',
				'\n',
				'<html><body><p>static</p></body></html>\n',
			],
		});

		await request(serverConfig.app)
			.get(`${PATH}/${DEFAULT_PAGE}`)
			.expect(200)
			.expect('set-cookie', 'C1=V1; Domain=mozilla.org; Path=/apex; Expires=Wed, 21 Oct 2015 07:28:00 GMT; HttpOnly')
			.expect(new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	it('redirect to a new url', async () => {
		sqlExecuteProxy({
			proc: 'sample.pageIndex();',
			lines: ['Location: www.google.com\n'],
		});

		await request(serverConfig.app).get(`${PATH}/${DEFAULT_PAGE}`).expect(302);
	});

	it('get json', async () => {
		sqlExecuteProxy({
			proc: 'sample.pageJson();',
			lines: ['Content-type: application/json\n', '\n', '{"name":"johndoe"}'],
		});

		await request(serverConfig.app).get(`${PATH}/sample.pageJson`).expect(200, {name: 'johndoe'});
	});

	it('get application/x-www-form-urlencoded', async () => {
		sqlExecuteProxy({
			proc: 'sample.pageForm(name=>:p_name);',
			para: [{name: 'name', value: 'johndoe'}],
			lines: ['Content-Type: text/html\n', '\n', '<html><body><p>static</p></body></html>\n'],
		});

		await request(serverConfig.app)
			.get(`${PATH}/sample.pageForm`)
			.set('Content-Type', 'application/x-www-form-urlencoded')
			.send('name=johndoe')
			.expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	it('get application/x-www-form-urlencoded with file', async () => {
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

		await test.expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});

	it('set status', async () => {
		sqlExecuteProxy({
			proc: 'sample.pageIndex();',
			lines: ['Status: 302 status\n'],
		});

		await request(serverConfig.app).get(`${PATH}/${DEFAULT_PAGE}`).expect(302);
	});

	it('set x-db-content-length header', async () => {
		sqlExecuteProxy({
			proc: 'sample.pageJson();',
			lines: ['x-db-content-length: 0\n'],
		});

		await request(serverConfig.app).get(`${PATH}/sample.pageJson`).expect(200);
	});

	it('use the pathAlias configuration setting', async () => {
		sqlExecuteProxy({
			proc: 'pathAlias(p_path=>:p_path);',
			lines: ['Content-type: text/html; charset=UTF-8\n', '\n', '<html><body><p>static</p></body></html>\n'],
		});

		await request(serverConfig.app).get(`${PATH}/alias`).expect(200, new RegExp('.*<html><body><p>static</p></body></html>.*'));
	});
});
