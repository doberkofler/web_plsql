/* eslint-disable class-methods-use-this, @typescript-eslint/no-unused-vars */

type executeCallbackType = (sql: string, bindParams?: any) => any;

let _executeCallback: executeCallbackType | null = null;

export function setExecuteCallback(callback: executeCallbackType | null = null): void {
	_executeCallback = callback;
}

export class Lob {
	type: number;

	constructor(type: number) {
		this.type = type;
	}
	close(): Promise<void> {
		return Promise.resolve();
	}
}

export class Connection {
	execute(sql: string, bindParams?: Record<string, unknown>, options?: Record<string, unknown>): Promise<any> {
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

export class ConnectionPool {
	onExecuteCallback: ((sql: string, bindParams: any) => any) | null;

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

export function createPool(options: Record<string, unknown>): Promise<ConnectionPool> {
	const connectionPool = new ConnectionPool();

	return Promise.resolve(connectionPool);
}

export function getConnection(options: Record<string, unknown>): Promise<Connection> {
	const connection = new Connection();

	return Promise.resolve(connection);
}

export const BIND_IN = 1;
export const BIND_INOUT = 2;
export const BIND_OUT = 3;

export const STRING = 4;
export const NUMBER = 5;
export const DATE = 6;
export const CURSOR = 7;
export const BUFFER = 8;
export const CLOB = 9;
export const BLOB = 10;

export const poolMin = 1;
export const poolMax = 1;
export const poolIncrement = 1;
export const poolTimeout = 1;
export const prefetchRows = 1;
export const stmtCacheSize = 1;

export const version = 0;
export const oracleClientVersion = 0;
