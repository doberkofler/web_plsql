import assert from 'node:assert';
import {describe, it} from 'node:test';
import request from 'supertest';
import {serverStart, serverStop, sqlExecuteProxy, PATH, DEFAULT_PAGE} from './server.js';

/**
 * @typedef {import('./server.js').serverConfigType} serverConfigType
 */

describe('transaction mode', () => {
	it('callback', async () => {
		let callbackInvokations = 0;

		const serverConfig = await serverStart({
			log: false,
			transactionMode: (_req, _connection) => {
				callbackInvokations++;
			},
		});

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

		assert.strictEqual(callbackInvokations, 1);

		await serverStop(serverConfig);
	});
});
