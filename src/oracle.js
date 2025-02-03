#!/usr/bin/env node

import debugModule from 'debug';
const debug = debugModule('webplsql:oracle');

//import oracledb from 'oracledb';

/**
 * @typedef {import('oracledb').Pool} Pool
 */

/**
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
