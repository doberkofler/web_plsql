import oracledb from 'oracledb';

const USE_MOCK = process.env.MOCK_ORACLE === 'true';

/**
 * Create a database pool.
 * @param config - The pool attributes.
 * @returns The pool.
 */
// Runtime switch for createPool
export async function createPool(config: oracledb.PoolAttributes): Promise<oracledb.Pool> {
	if (USE_MOCK) {
		const mock = await import('./oracledb-mock.ts');
		return mock.createPool(config);
	}
	return await oracledb.createPool(config);
}

// Always export real oracledb constants (they're identical in mock)
export const BIND_IN = oracledb.BIND_IN;
export const BIND_OUT = oracledb.BIND_OUT;
export const BIND_INOUT = oracledb.BIND_INOUT;
export const STRING = oracledb.STRING;
export const NUMBER = oracledb.NUMBER;
export const DATE = oracledb.DATE;
export const CURSOR = oracledb.CURSOR;
export const BUFFER = oracledb.BUFFER;
export const CLOB = oracledb.CLOB;
export const BLOB = oracledb.BLOB;
export const DB_TYPE_VARCHAR = oracledb.DB_TYPE_VARCHAR;
export const DB_TYPE_CLOB = oracledb.DB_TYPE_CLOB;
export const DB_TYPE_NUMBER = oracledb.DB_TYPE_NUMBER;
export const DB_TYPE_DATE = oracledb.DB_TYPE_DATE;

// Re-export types from real oracledb for convenience
export type {Connection, Pool, Lob, Result, BindParameter, BindParameters, ExecuteOptions, DbType} from 'oracledb';

// Export mock-specific utilities
export {setExecuteCallback, type ExecuteCallback} from './oracledb-mock.ts';
