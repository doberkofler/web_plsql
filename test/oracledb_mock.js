// @flow

const assert = require('chai').assert;
// $FlowFixMe
const oracledb = require('../lib/oracledb_mock');

describe('oracledb', () => {
	it('createPool', async () => {
		const connectionPool = await getConnectionPool();
		assert.isTrue(connectionPool instanceof oracledb.ConnectionPool);
		return connectionPool;
	});

	it('getConnection', async () => {
		const connection = await getConnection();
		assert.isTrue(connection instanceof oracledb.Connection);
		return connection;
	});
});

describe('ConnectionPool', () => {
	it('getConnection', async () => {
		const connectionPool = await getConnectionPool();
		const connection = await connectionPool.getConnection();

		assert.isTrue(connection instanceof oracledb.Connection);

		return connection;
	});

	it('close', async () => {
		const connectionPool = await getConnectionPool();
		await connectionPool.close();
	});
});

describe('Connection', () => {
	it('getConnection', async () => {
		const connection = await getConnection();
		assert.isTrue(connection instanceof oracledb.Connection);
		return connection;
	});

	it('createLob', async () => {
		const connection = await getConnection();
		const lob = await connection.createLob(oracledb.BLOB);
		assert.isTrue(lob instanceof oracledb.Lob);
		return lob;
	});

	it('release', async () => {
		const connection = await getConnection();
		return connection.release();
	});
});

describe('Connection.execute', () => {
	beforeEach(() => {
		oracledb.setExecuteCallback();
	});

	it('execute', async () => {
		const connection = await getConnection();
		assert.deepEqual(await connection.execute('select * from dual'), {});
	});

	it('execute with execution callback', async () => {
		const connection = await getConnection();
		const SQL = 'select * from dual';

		// register an execute callback
		oracledb.setExecuteCallback(sql => {
			assert.strictEqual(sql, SQL);
			return {sql: SQL};
		});

		assert.deepEqual(await connection.execute(SQL), {sql: SQL});
	});
});

/*
*	get connection pool
*/
function getConnectionPool() {
	return oracledb.createPool({
		user: 'sample',
		password: 'sample',
		connectString: 'localhost:1521/TEST'
	});
}

/*
*	get connection
*/
function getConnection() {
	return oracledb.getConnection({
		user: 'sample',
		password: 'sample',
		connectString: 'localhost:1521/TEST'
	});
}
