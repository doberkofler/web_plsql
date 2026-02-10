import debugModule from 'debug';
const debug = debugModule('webplsql:oracle');

import oracledb from 'oracledb';
export type {Pool} from 'oracledb';

/**
 * Test is the connection is valid.
 * @param connectionPool - database connection
 * @returns success
 */
export const connectionValid = async (connectionPool: oracledb.Pool): Promise<boolean> => {
	/* c8 ignore start */ // Mock only used in E2E tests
	if (process.env.MOCK_ORACLE === 'true') {
		return true;
	}
	/* c8 ignore stop */
	let connection: oracledb.Connection | undefined;
	try {
		connection = await connectionPool.getConnection();
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
 * Allocate the Oracle database pool.
 * @param user - The database user name.
 * @param password - The password of the database user.
 * @param connectString - The Oracle database instance to connect to. The string can be an Easy Connect string, or a Net Service Name from a tnsnames.ora file, or the name of a local Oracle database instance.
 * @param poolMin - The minimum number of connections a connection pool maintains.
 * @param poolMax - The maximum number of connections to which a connection pool can grow.
 * @returns The connection pool.
 */
export const poolCreate = async (user: string, password: string, connectString: string, poolMin = 10, poolMax = 1000): Promise<oracledb.Pool> => {
	/* c8 ignore start */ // Mock only used in E2E tests, not covered by unit tests
	if (process.env.MOCK_ORACLE === 'true') {
		debug('Using mock Oracle database pool');
		return {
			close: () => {
				debug('Mock pool closed');
				return Promise.resolve();
			},
			getConnection: () => {
				return Promise.resolve({
					execute: () => Promise.resolve({rows: []}),
					release: () => Promise.resolve(),
					close: () => Promise.resolve(),
				});
			},
			connectionsOpen: 0,
			connectionsInUse: 0,
		} as unknown as oracledb.Pool;
	}
	/* c8 ignore stop */
	const pool = await oracledb.createPool({
		user, // The database user name.
		password, // The password of the database user.
		connectString, // The Oracle database instance to connect to. The string can be an Easy Connect string, or a Net Service Name from a tnsnames.ora file, or the name of a local Oracle database instance.
		poolMin, // The minimum number of connections a connection pool maintains, even when there is no activity to the target database.
		poolMax, // The maximum number of connections to which a connection pool can grow.
		poolIncrement: 10, // The number of connections that are opened whenever a connection request exceeds the number of currently open connections.
		queueTimeout: 1000, // The number of milliseconds after which connection requests waiting in the connection request queue are terminated. If queueTimeout is 0, then queued connection requests are never terminated.
	});

	const valid = await connectionValid(pool);
	if (!valid) {
		await poolClose(pool);
		throw new Error(`Unable to connect with Oracle Database as ${user}@${connectString}`);
	}

	return pool;
};

/**
 * Close the Oracle database pool.
 * @param pool - The connection pool.
 */
export const poolClose = async (pool: oracledb.Pool): Promise<void> => {
	try {
		await pool.close(0);
	} catch (err) {
		debug('Cannot close pool', err);
	}
};

/**
 * Close the Oracle database pools.
 * @param pools - The connection pools.
 */
export const poolsClose = async (pools: oracledb.Pool[]): Promise<void> => {
	await Promise.all(pools.map(poolClose));
};
