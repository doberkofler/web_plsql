import {assert, describe, it, beforeEach, beforeAll, afterAll} from 'vitest';
import {createPool, DB} from '../../../src/backend/util/db.ts';
import {setExecuteCallback, MockPool, MockConnection, MockLob} from '../../../src/backend/util/db-mock.ts';

describe('oracledb', () => {
	let connectionPool: any;

	let connection: any;

	it('createPool', async () => {
		process.env.MOCK_ORACLE = 'true';
		connectionPool = await createPool({
			user: 'sample',
			password: 'sample',
			connectString: 'localhost:1521/TEST',
		});
		assert.strictEqual(connectionPool instanceof MockPool, true);
	});

	it('getConnection', async () => {
		connection = await connectionPool.getConnection();
		assert.strictEqual(connection instanceof MockConnection, true);
	});

	it('createLob', async () => {
		const lob = await connection.createLob(DB.BLOB);
		assert.strictEqual(lob instanceof MockLob, true);
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
		process.env.MOCK_ORACLE = 'true';
		connectionPool = await createPool({
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
		setExecuteCallback();
	});

	it('execute', async () => {
		const result = await connection.execute('select * from dual');
		assert.deepStrictEqual(result, {rows: []});
	});

	it('execute with execution callback', async () => {
		const SQL = 'select * from dual';

		// register an execute callback
		setExecuteCallback((sql: string) => {
			assert.strictEqual(sql, SQL);
			return {sql: SQL} as any;
		});

		const result = await connection.execute(SQL);
		assert.deepStrictEqual(result, {sql: SQL});
	});
});
