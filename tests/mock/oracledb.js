import debugModule from 'debug';
const debug = debugModule('webplsql:oracledb');

/**
 * @file Mock OracleDB Implementation for Testing
 * @description
 * This module provides a mock implementation of the Oracle Database driver (`oracledb`)
 * for use in unit and integration tests. It allows developers to simulate database
 * interactions without requiring a running Oracle Database instance.
 *
 * ## Features
 * - **Interception**: Captures SQL execution requests via a global callback.
 * - **Deterministic Behavior**: Allows tests to define exact return values for specific queries.
 * - **No Network I/O**: Eliminates database latency, making tests fast and reliable.
 * - **Type Safety**: JSDoc annotated for better developer experience.
 *
 * ## Usage Example
 *
 * ```javascript
 * import * as oracledb from './mock/oracledb.js';
 *
 * // 1. Set up the mock response
 * oracledb.setExecuteCallback((sql, bindParams) => {
 *   if (sql.includes('SELECT user_id FROM users')) {
 *     return {
 *       rows: [
 *         { USER_ID: 101, USERNAME: 'alice' }
 *       ]
 *     };
 *   }
 *   return { rows: [] };
 * });
 *
 * // 2. Run your code that uses oracledb
 * const conn = await oracledb.getConnection();
 * const result = await conn.execute('SELECT user_id FROM users');
 * console.log(result.rows); // [{ USER_ID: 101, USERNAME: 'alice' }]
 * ```
 */

/**
 * @typedef {import('../../src/types.js').BindParameterConfig} BindParameterConfig
 *
 * @typedef {object} ExecuteResult
 * @property {Array<any>} [rows] - The rows returned by a SELECT query.
 * @property {object} [outBinds] - Output bind variables (for PL/SQL).
 * @property {number} [rowsAffected] - Number of rows affected by DML.
 * @property {import('stream').Readable} [lob] - LOB stream if applicable.
 * @property {string} [sql] - SQL statement (optional for tests).
 *
 * @typedef {(sql: string, bindParams?: BindParameterConfig) => ExecuteResult | Promise<ExecuteResult>} executeCallbackType
 */

/**
 * Global callback to intercept SQL execution.
 * @type {executeCallbackType | null}
 * @private
 */
let _executeCallback = null;

/**
 * Sets the callback function to handle SQL execution requests.
 * Use this in tests to define how the mock database should respond to specific queries.
 *
 * @param {executeCallbackType | null} callback - The callback function or null to reset.
 * @return {void}
 */
export const setExecuteCallback = (callback = null) => {
	_executeCallback = callback;
};

/**
 * Mock Large Object (LOB) class.
 * Simulates the behavior of Oracle LOBs.
 */
export class Lob {
	/**
	 * Creates an instance of Lob.
	 * @param {number} type - The type of Lob (Blob or Clob).
	 */
	constructor(type) {
		debug('Lob.constructor', type);
		/** @type {number} */
		this.type = type;
	}
	/**
	 * Destroy the LOB.
	 * @return {Promise<void>}
	 */
	destroy() {
		debug('Lob.destroy');
		return Promise.resolve();
	}
}

/**
 * Mock Connection Pool class.
 * Simulates a pool of database connections.
 */
export class Pool {
	/**
	 * Get a connection from the pool.
	 * @return {Promise<Connection>} A promise resolving to a mock Connection.
	 */
	getConnection() {
		debug('Pool.getConnection');
		return Promise.resolve(new Connection());
	}

	/**
	 * Close the pool.
	 * @param {any} _dummy - Optional drain time (ignored).
	 * @return {Promise<void>}
	 */
	close(_dummy) {
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
	 * @param {string} sql - The SQL to execute.
	 * @param {BindParameterConfig} [bindParams] - The bind parameters.
	 * @param {unknown} [options] - Execution options (e.g., autoCommit).
	 * @return {Promise<unknown>} The result of the execution.
	 */
	execute(sql, bindParams, options) {
		debug('Connection.execute', sql, bindParams, options);
		return Promise.resolve(_executeCallback ? _executeCallback(sql, bindParams) : {});
	}

	/**
	 * Create a temporary LOB.
	 * @param {number} type - The type of Lob.
	 * @return {Promise<Lob>}
	 */
	createLob(type) {
		debug('Connection.createLob');
		const lob = new Lob(type);
		return Promise.resolve(lob);
	}

	/**
	 * Commit the transaction.
	 * @return {Promise<void>}
	 */
	commit() {
		debug('Connection.commit');
		return Promise.resolve();
	}

	/**
	 * Rollback the transaction.
	 * @return {Promise<void>}
	 */
	rollback() {
		debug('Connection.rollback');
		return Promise.resolve();
	}

	/**
	 * Release the connection back to the pool.
	 * @return {Promise<void>}
	 */
	release() {
		debug('Connection.release');
		return Promise.resolve();
	}
}

/**
 * Create a connection pool.
 * @param {unknown} _options - Pool configuration (user, password, etc.).
 * @returns {Promise<Pool>} A promise resolving to a new mock Pool.
 */
export const createPool = (_options) => {
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
