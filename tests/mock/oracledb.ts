import debugModule from 'debug';
const debug = debugModule('webplsql:oracledb');
import type {Readable} from 'stream';
import type {BindParameterConfig} from '../../src/backend/types.ts';

/**
 * @file Mock OracleDB Implementation for Testing
 */

export type ExecuteResult = {
	rows?: any[];

	outBinds?: any;
	rowsAffected?: number;
	lob?: Readable;
	sql?: string;
};

export type executeCallbackType = (sql: string, bindParams?: BindParameterConfig) => ExecuteResult | Promise<ExecuteResult>;

/**
 * Global callback to intercept SQL execution.
 */
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
export class Lob {
	type: number;
	/**
	 * Creates an instance of Lob.
	 * @param type - The type of Lob (Blob or Clob).
	 */
	constructor(type: number) {
		debug('Lob.constructor', type);
		this.type = type;
	}
	/**
	 * Destroy the LOB.
	 * @returns Promise resolving to void.
	 */
	destroy(): void {
		debug('Lob.destroy');
	}
}

/**
 * Mock Connection Pool class.
 * Simulates a pool of database connections.
 */
export class Pool {
	connectionsOpen = 0;
	connectionsInUse = 0;

	/**
	 * Get a connection from the pool.
	 * @returns A promise resolving to a mock Connection.
	 */
	getConnection(): Promise<Connection> {
		debug('Pool.getConnection');
		return Promise.resolve(new Connection());
	}

	/**
	 * Close the pool.
	 * @param _dummy - Optional drain time (ignored).
	 * @returns Promise resolving to void.
	 */

	close(_dummy?: unknown): Promise<void> {
		debug('Pool.close');
		return Promise.resolve();
	}
}

/**
 * Mock Connection class.
 * Simulates a single database connection.
 */
export class Connection {
	/**
	 * Execute a SQL statement.
	 * Delegates execution to the global callback set via {@link setExecuteCallback}.
	 *
	 * @param sql - The SQL to execute.
	 * @param bindParams - The bind parameters.
	 * @param options - Execution options (e.g., autoCommit).
	 * @returns The result of the execution.
	 */

	execute(sql: string, bindParams?: BindParameterConfig, options?: unknown): Promise<unknown> {
		debug('Connection.execute', sql, bindParams, options);
		return Promise.resolve(_executeCallback ? _executeCallback(sql, bindParams) : {});
	}

	/**
	 * Create a temporary LOB.
	 * @param type - The type of Lob.
	 * @returns Promise resolving to Lob.
	 */
	createLob(type: number): Promise<Lob> {
		debug('Connection.createLob');
		const lob = new Lob(type);
		return Promise.resolve(lob);
	}

	/**
	 * Commit the transaction.
	 * @returns Promise resolving to void.
	 */
	commit(): Promise<void> {
		debug('Connection.commit');
		return Promise.resolve();
	}

	/**
	 * Rollback the transaction.
	 * @returns Promise resolving to void.
	 */
	rollback(): Promise<void> {
		debug('Connection.rollback');
		return Promise.resolve();
	}

	/**
	 * Release the connection back to the pool.
	 * @returns Promise resolving to void.
	 */
	release(): Promise<void> {
		debug('Connection.release');
		return Promise.resolve();
	}
}

/**
 * Create a connection pool.
 * @param _options - Pool configuration (user, password, etc.).
 * @returns A promise resolving to a new mock Pool.
 */

export const createPool = (_options: unknown): Promise<Pool> => {
	debug('createPool');
	return Promise.resolve(new Pool());
};

// OracleDB Constants
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
export const DB_TYPE_VARCHAR = 2001;
export const DB_TYPE_CLOB = 2002;
export const DB_TYPE_NUMBER = 2003;
export const DB_TYPE_DATE = 2004;

// Pool Constants
export const poolMin = 1;
export const poolMax = 1;
export const poolIncrement = 1;
export const poolTimeout = 1;
export const prefetchRows = 1;
export const stmtCacheSize = 1;

// Version Info
export const version = 0;
export const oracleClientVersion = 0;
