import {describe, beforeEach, it, expect} from '@jest/globals';
import {setExecuteCallback, createPool, Connection, getConnection, ConnectionPool, Lob, BLOB} from '../mock/oracledb';

describe('oracledb', () => {
	it('createPool', async () => {
		const connectionPool = await _createPool();
		expect(connectionPool).toBeInstanceOf(ConnectionPool);
		return connectionPool;
	});

	it('getConnection', async () => {
		const connection = await _getConnection();
		expect(connection).toBeInstanceOf(Connection);
		return connection;
	});
});

describe('ConnectionPool', () => {
	it('getConnection', async () => {
		const connectionPool = await _createPool();
		const connection = await connectionPool.getConnection();

		expect(connection).toBeInstanceOf(Connection);

		return connection;
	});

	it('close', async () => {
		const connectionPool = await _createPool();
		await connectionPool.close();
	});
});

describe('Connection', () => {
	it('getConnection', async () => {
		const connection = await _getConnection();
		expect(connection).toBeInstanceOf(Connection);
		return connection;
	});

	it('createLob', async () => {
		const connection = await _getConnection();
		const lob = await connection.createLob(BLOB);
		expect(lob).toBeInstanceOf(Lob);
		return lob;
	});

	it('release', async () => {
		const connection = await _getConnection();
		return connection.release();
	});
});

describe('Connection.execute', () => {
	beforeEach(() => {
		setExecuteCallback();
	});

	it('execute', async () => {
		const connection = await _getConnection();
		expect(await connection.execute('select * from dual')).toStrictEqual({});
	});

	it('execute with execution callback', async () => {
		const connection = await _getConnection();
		const SQL = 'select * from dual';

		// register an execute callback
		setExecuteCallback((sql: string) => {
			expect(sql).toBe(SQL);
			return {sql: SQL};
		});

		expect(await connection.execute(SQL)).toStrictEqual({sql: SQL});
	});
});

/*
*	get connection pool
*/
function _createPool() {
	return createPool({
		user: 'sample',
		password: 'sample',
		connectString: 'localhost:1521/TEST'
	});
}

/*
*	get connection
*/
function _getConnection() {
	return getConnection({
		user: 'sample',
		password: 'sample',
		connectString: 'localhost:1521/TEST'
	});
}
