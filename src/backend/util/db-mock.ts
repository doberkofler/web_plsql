import debugModule from 'debug';
const debug = debugModule('webplsql:db-mock');
import type {IDbPool, IDbConnection, IDbResult, IDbLob, IDbBindParameterConfig} from './db-types.ts';

/**
 * Global callback to intercept SQL execution.
 */
export type executeCallbackType = (sql: string, bindParams?: IDbBindParameterConfig) => IDbResult | Promise<IDbResult>;

let _executeCallback: executeCallbackType | null = null;

/**
 * Sets the callback function to handle SQL execution requests.
 * Use this in tests to define how the mock database should respond to specific queries.
 *
 * @param callback - The callback function or null to reset.
 */
export const setExecuteCallback = (callback: executeCallbackType | null = null): void => {
	_executeCallback = callback;
};

/**
 * Mock Large Object (LOB) class.
 * Simulates the behavior of Oracle LOBs.
 */
export class MockLob implements IDbLob {
	type: number;

	constructor(type: number) {
		debug('MockLob.constructor', type);
		this.type = type;
	}

	destroy(): void {
		debug('MockLob.destroy');
	}
}

/**
 * Mock Connection class.
 * Simulates a single database connection.
 */
export class MockConnection implements IDbConnection {
	private pool: MockPool;

	constructor(pool: MockPool) {
		this.pool = pool;
	}

	execute<T = unknown>(sql: string, bindParams?: IDbBindParameterConfig, options?: unknown): Promise<IDbResult<T>> {
		debug('MockConnection.execute', sql, bindParams, options);
		if (_executeCallback) {
			return Promise.resolve(_executeCallback(sql, bindParams) as unknown as IDbResult<T>);
		}
		return Promise.resolve({rows: []});
	}

	createLob(type: unknown): Promise<IDbLob> {
		debug('MockConnection.createLob');
		return Promise.resolve(new MockLob(type as number));
	}

	commit(): Promise<void> {
		debug('MockConnection.commit');
		return Promise.resolve();
	}

	rollback(): Promise<void> {
		debug('MockConnection.rollback');
		return Promise.resolve();
	}

	release(): Promise<void> {
		debug('MockConnection.release');
		this.pool.releaseConnection();
		return Promise.resolve();
	}
}

/**
 * Mock Connection Pool class.
 * Simulates a pool of database connections.
 */
export class MockPool implements IDbPool {
	connectionsOpen = 0;
	connectionsInUse = 0;

	getConnection(): Promise<IDbConnection> {
		debug('MockPool.getConnection');
		this.connectionsInUse++;
		this.connectionsOpen = Math.max(this.connectionsOpen, this.connectionsInUse);
		return Promise.resolve(new MockConnection(this));
	}

	releaseConnection(): void {
		this.connectionsInUse--;
	}

	close(_drainTime?: number): Promise<void> {
		debug('MockPool.close');
		this.connectionsOpen = 0;
		this.connectionsInUse = 0;
		return Promise.resolve();
	}
}

/**
 * Factory function to create a mock pool.
 * @param _config - Pool configuration.
 * @returns Promise.
 */
export const createPool = (_config: unknown): Promise<IDbPool> => {
	debug('createPool (mock)');
	return Promise.resolve(new MockPool());
};

// Mock Constants (using numeric identifiers for mock mode)
export const CONSTANTS = {
	BIND_IN: 3001,
	BIND_INOUT: 3002,
	BIND_OUT: 3003,

	// These are typically DbType objects in real oracledb, but we use numbers/strings here as placeholders
	// The application just passes them through, so type consistency internally matters most.
	STRING: 2001,
	NUMBER: 2002,
	DATE: 2003,
	CURSOR: 2004,
	BUFFER: 2005,
	CLOB: 2006,
	BLOB: 2007,

	DB_TYPE_VARCHAR: 2001,
	DB_TYPE_CLOB: 2006,
	DB_TYPE_NUMBER: 2002,
	DB_TYPE_DATE: 2003,
};
