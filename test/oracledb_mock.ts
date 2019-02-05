import {assert} from 'chai';
import {setExecuteCallback, createPool, Connection, getConnection, ConnectionPool, Lob, BLOB} from './mock/oracledb';

describe('oracledb', () => {
	it('createPool', async () => {
		const connectionPool = await _createPool();
		assert.isTrue(connectionPool instanceof ConnectionPool);
		return connectionPool;
	});

	it('getConnection', async () => {
		const connection = await _getConnection();
		assert.isTrue(connection instanceof Connection);
		return connection;
	});
});

describe('ConnectionPool', () => {
	it('getConnection', async () => {
		const connectionPool = await _createPool();
		const connection = await connectionPool.getConnection();

		assert.isTrue(connection instanceof Connection);

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
		assert.isTrue(connection instanceof Connection);
		return connection;
	});

	it('createLob', async () => {
		const connection = await _getConnection();
		const lob = await connection.createLob(BLOB);
		assert.isTrue(lob instanceof Lob);
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
		assert.deepEqual(await connection.execute('select * from dual'), {});
	});

	it('execute with execution callback', async () => {
		const connection = await _getConnection();
		const SQL = 'select * from dual';

		// register an execute callback
		setExecuteCallback((sql: string) => {
			assert.strictEqual(sql, SQL);
			return {sql: SQL};
		});

		assert.deepEqual(await connection.execute(SQL), {sql: SQL});
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
