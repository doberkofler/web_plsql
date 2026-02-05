import {assert, describe, it, beforeEach, beforeAll, afterAll} from 'vitest';
import * as oracledb from './mock/oracledb.js';

describe('oracledb', () => {
	/** @type {oracledb.Pool} */
	let connectionPool;
	/** @type {oracledb.Connection} */
	let connection;

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

	it('release', async () => {
		await connection.release();
	});

	it('close', async () => {
		await connectionPool.close(0);
	});
});

describe('Connection.execute', () => {
	/** @type {oracledb.Pool} */
	let connectionPool;
	/** @type {oracledb.Connection} */
	let connection;

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
