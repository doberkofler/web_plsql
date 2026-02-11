import debugModule from 'debug';
const debug = debugModule('webplsql:db');

import type {IDbPool, IDbConnection, IDbResult, IDbLob, IDbBindParameter, IDbBindParameterConfig, IDbModule} from './db-types.ts';

// Re-export the interfaces so consumers just import from here
export type {
	IDbPool as Pool,
	IDbConnection as Connection,
	IDbResult as Result,
	IDbLob as Lob,
	IDbBindParameter as BindParameter,
	IDbBindParameterConfig as BindParameterConfig,
	IDbModule as DbModule,
};

// Import implementations
import * as mockDB from './db-mock.ts';
import oracledb from 'oracledb';

/**
 * ADAPTER PATTERN IMPLEMENTATION
 *
 * Design Decision:
 * We use an Adapter Pattern to abstract the underlying database driver.
 * This allows us to:
 * 1. seamless switch between the real 'oracledb' driver and our 'db-mock' implementation.
 * 2. decouple the application code from specific driver versions or quirks.
 * 3. provide a type-safe interface that eliminates 'any' usage.
 *
 * The 'DB' constant exports the database constants (types, bind directions).
 * The 'createPool' function acts as a Factory, returning either a RealPool or a MockPool.
 */

/**
 * Wrapper for the Real Oracle Connection.
 * This ensures the real driver conforms exactly to our IDbConnection interface.
 */
class RealConnection implements IDbConnection {
	private conn: oracledb.Connection;

	constructor(conn: oracledb.Connection) {
		this.conn = conn;
	}

	/**
	 * Execute a SQL statement.
	 *
	 * @param sql - The SQL statement.
	 * @param bindParams - Bind parameters (object or array).
	 * @param options - Execution options (autoCommit, etc.).
	 * @returns The result.
	 */
	async execute<T = unknown>(sql: string, bindParams?: IDbBindParameterConfig | unknown[], options?: oracledb.ExecuteOptions): Promise<IDbResult<T>> {
		// We cast to 'any' here because oracledb types are complex and strict,
		// but we know our interface is compatible at runtime.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
		const result = await this.conn.execute(sql, (bindParams ?? {}) as any, options ?? {});
		return result as unknown as IDbResult<T>;
	}

	async createLob(type: unknown): Promise<IDbLob> {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
		return (await this.conn.createLob(type as any)) as unknown as IDbLob;
	}

	async commit(): Promise<void> {
		return await this.conn.commit();
	}

	async rollback(): Promise<void> {
		return await this.conn.rollback();
	}

	async release(): Promise<void> {
		return await this.conn.release();
	}
}

/**
 * Wrapper for the Real Oracle Pool.
 */
class RealPool implements IDbPool {
	private pool: oracledb.Pool;

	constructor(pool: oracledb.Pool) {
		this.pool = pool;
	}

	get connectionsOpen(): number {
		return this.pool.connectionsOpen;
	}

	get connectionsInUse(): number {
		return this.pool.connectionsInUse;
	}

	async getConnection(): Promise<IDbConnection> {
		const conn = await this.pool.getConnection();
		return new RealConnection(conn);
	}

	async close(drainTime?: number): Promise<void> {
		return await this.pool.close(drainTime ?? 0);
	}
}

/**
 * The Database Module Interface (Constants).
 *
 * We export a unified object that contains all database constants.
 * In MOCK mode, these are simple numbers/placeholders.
 * In REAL mode, these are the actual constants/objects from the 'oracledb' library.
 */
export const DB = (process.env.MOCK_ORACLE === 'true' ? mockDB.CONSTANTS : oracledb) as Omit<IDbModule, 'createPool'>;

/**
 * Create a database connection pool.
 * Switches between Real and Mock implementation based on env var.
 *
 * @param config - Pool configuration (user, password, connectString, etc.)
 * @returns The connection pool.
 */
export const createPool = async (config: unknown): Promise<IDbPool> => {
	if (process.env.MOCK_ORACLE === 'true') {
		debug('Creating MOCK pool');
		return mockDB.createPool(config);
	}
	debug('Creating REAL pool');
	const realPool = await oracledb.createPool(config as oracledb.PoolAttributes);
	return new RealPool(realPool);
};

/**
 * Validate a connection pool.
 * Helper function to check if a pool is usable.
 * @param pool - The pool to validate.
 * @returns True if valid.
 */
export const connectionValid = async (pool: IDbPool): Promise<boolean> => {
	/* c8 ignore start */ // Mock only used in E2E tests
	if (process.env.MOCK_ORACLE === 'true') {
		return true;
	}
	/* c8 ignore stop */

	let connection: IDbConnection | undefined;
	try {
		connection = await pool.getConnection();
		debug('connection valid');
		return true;
	} catch (err) {
		debug('connection broken', err);
		return false;
	} finally {
		if (connection) {
			await connection.release();
		}
	}
};

/**
 * Close a pool safely.
 * Swallows errors during close to prevent crashes during shutdown.
 * @param pool - The pool to close.
 */
export const poolClose = async (pool: IDbPool): Promise<void> => {
	try {
		await pool.close(0);
	} catch (err) {
		debug('Cannot close pool', err);
	}
};

/**
 * Close multiple pools.
 * @param pools - The pools to close.
 */
export const poolsClose = async (pools: IDbPool[]): Promise<void> => {
	await Promise.all(pools.map(poolClose));
};
