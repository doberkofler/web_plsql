import oracledb from 'oracledb';
export type { Pool } from 'oracledb';
/**
 * Test is the connection is valid.
 * @param connectionPool - database connection
 * @returns success
 */
export declare const connectionValid: (connectionPool: oracledb.Pool) => Promise<boolean>;
/**
 * Allocate the Oracle database pool.
 * @param user - The database user name.
 * @param password - The password of the database user.
 * @param connectString - The Oracle database instance to connect to. The string can be an Easy Connect string, or a Net Service Name from a tnsnames.ora file, or the name of a local Oracle database instance.
 * @param poolMin - The minimum number of connections a connection pool maintains.
 * @param poolMax - The maximum number of connections to which a connection pool can grow.
 * @returns The connection pool.
 */
export declare const poolCreate: (user: string, password: string, connectString: string, poolMin?: number, poolMax?: number) => Promise<oracledb.Pool>;
/**
 * Close the Oracle database pool.
 * @param pool - The connection pool.
 */
export declare const poolClose: (pool: oracledb.Pool) => Promise<void>;
/**
 * Close the Oracle database pools.
 * @param pools - The connection pools.
 */
export declare const poolsClose: (pools: oracledb.Pool[]) => Promise<void>;
