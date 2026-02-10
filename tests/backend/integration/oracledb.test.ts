import {assert, describe, it, beforeEach, beforeAll, afterAll} from 'vitest';
import * as oracledb from '../../mock/oracledb.ts';

describe('oracledb', () => {
	let connectionPool: any;

	let connection: any;

	it('createPool', async () => {
		connectionPool = await oracledb.createPool({
			user: 'sample',
			password: 'sample',
			connectString: 'localhost:1521/TEST',
		});
		assert.strictEqual(connectionPool instanceof oracledb.Pool, true);
	});

	it('getConnection', async () => {
		connection = await connectionPool.getConnection();
		assert.strictEqual(connection instanceof oracledb.Connection, true);
	});

	it('createLob', async () => {
		const lob = await connection.createLob(oracledb.BLOB);
		assert.strictEqual(lob instanceof oracledb.Lob, true);
		await lob.destroy();
	});

	it('commit', async () => {
		await connection.commit();
	});

	it('rollback', async () => {
		await connection.rollback();
	});

	it('release', async () => {
		await connection.release();
	});

	it('close', async () => {
		await connectionPool.close(0);
	});
});

describe('Connection.execute', () => {
	let connectionPool: any;

	let connection: any;

	beforeAll(async () => {
		connectionPool = await oracledb.createPool({
			user: 'sample',
			password: 'sample',
			connectString: 'localhost:1521/TEST',
		});
		connection = await connectionPool.getConnection();
	});

	afterAll(async () => {
		await connection.release();
		await connectionPool.close(0);
	});

	beforeEach(() => {
		oracledb.setExecuteCallback();
	});

	it('execute', async () => {
		const result = await connection.execute('select * from dual');
		assert.deepStrictEqual(result, {});
	});

	it('execute with execution callback', async () => {
		const SQL = 'select * from dual';

		// register an execute callback
		oracledb.setExecuteCallback((sql) => {
			assert.strictEqual(sql, SQL);
			return {sql: SQL};
		});

		const result = await connection.execute(SQL);
		assert.deepStrictEqual(result, {sql: SQL});
	});
});
