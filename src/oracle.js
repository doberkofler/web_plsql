import debugModule from 'debug';
const debug = debugModule('webplsql:oracle');

import oracledb from 'oracledb';

/**
 * @typedef {import('oracledb').Pool} Pool
 */

/**
 * Test is the connection is valid.
 * @param {Pool} connectionPool - database connection
 * @returns {Promise<boolean>} - success
 */
export const connectionValid = async (connectionPool) => {
	let connection;
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
 * @param {string} user - The database user name.
 * @param {string} password - The password of the database user.
 * @param {string} connectString - The Oracle database instance to connect to. The string can be an Easy Connect string, or a Net Service Name from a tnsnames.ora file, or the name of a local Oracle database instance.
 * @param {number} poolMin - The minimum number of connections a connection pool maintains.
 * @param {number} poolMax - The maximum number of connections to which a connection pool can grow.
 * @returns {Promise<Pool>} - The connection pool.
 */
export const poolCreate = async (user, password, connectString, poolMin = 10, poolMax = 1000) => {
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
 * @param {Pool} pool - The connection pool.
 * @returns {Promise<void>}
 */
export const poolClose = async (pool) => {
	try {
		await pool.close(0);
	} catch (err) {
		debug('Cannot close pool', err);
	}
};

/**
 * Close the Oracle database pools.
 * @param {Pool[]} pools - The connection pools.
 * @returns {Promise<void>}
 */
export const poolsClose = async (pools) => {
	await Promise.all(pools.map(poolClose));
};
