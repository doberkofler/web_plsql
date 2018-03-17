// @flow

/* eslint-disable class-methods-use-this, no-unused-vars */

type executeCallbackType = (sql: string, bindParams: ?Object) => Object;

let _executeCallback: executeCallbackType | null = null;
function setExecuteCallback(callback: executeCallbackType | null = null) {
	_executeCallback = callback;
}

class Lob {
	type: number;

	constructor(type: number) {
		this.type = type;
	}
	close() {
		return Promise.resolve();
	}
}

class Connection {
	execute(sql: string, bindParams: ?Object, options: ?Object): Promise<Object> {
		return Promise.resolve(_executeCallback ? _executeCallback(sql, bindParams) : {});
	}
	createLob(type: number): Promise<Lob> {
		const lob = new Lob(type);
		return Promise.resolve(lob);
	}
	release(): Promise<void> {
		return Promise.resolve();
	}
}

class ConnectionPool {
	onExecuteCallback: ?(sql: string, bindParams: Object) => Object;

	constructor() {
		this.onExecuteCallback = null;
	}

	getConnection(): Promise<Connection> {
		const connection = new Connection();

		return Promise.resolve(connection);
	}

	close(): Promise<void> {
		return Promise.resolve();
	}
}

function createPool(options: Object): Promise<ConnectionPool> {
	const connectionPool = new ConnectionPool();

	return Promise.resolve(connectionPool);
}

function getConnection(options: Object): Promise<Connection> {
	const connection = new Connection();

	return Promise.resolve(connection);
}

module.exports = {
	BIND_IN: 1,
	BIND_INOUT: 2,
	BIND_OUT: 3,

	STRING: 4,
	NUMBER: 5,
	DATE: 6,
	CURSOR: 7,
	BUFFER: 8,
	CLOB: 9,
	BLOB: 10,

	poolMin: 1,
	poolMax: 1,
	poolIncrement: 1,
	poolTimeout: 1,
	prefetchRows: 1,
	stmtCacheSize: 1,

	version: 0,
	oracleClientVersion: 0,

	Lob,
	Connection,
	ConnectionPool,

	createPool,
	getConnection,

	setExecuteCallback
};
