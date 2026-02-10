import {assert, describe, it} from 'vitest';
import request from 'supertest';
import {serverStart, serverStop, sqlExecuteProxy, PATH, DEFAULT_PAGE} from '../../server.ts';

describe('transaction mode', () => {
	it('callback', async () => {
		let callbackInvokations = 0;

		const serverConfig = await serverStart({
			log: false,

			transactionMode: (_connection, procedure) => {
				assert.strictEqual(procedure, 'sample.pageIndex');
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
