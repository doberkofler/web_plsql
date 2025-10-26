#!/usr/bin/env node

import {startServer} from '../src/index.js';
import oracledb from 'oracledb';

/**
 * @param {import('oracledb').Connection} connection - Oracle DB connection.
 * @returns {Promise<boolean>}
 */
const hasOpenTransaction = async (connection) => {
	const sql = `SELECT COUNT(*) FROM sys.v_$transaction t JOIN sys.v_$session s ON t.ses_addr = s.saddr WHERE s.audsid = USERENV('SESSIONID')`;
	/** @type {import('oracledb').Result<number>} */
	let result;

	try {
		result = await connection.execute(sql, [], {
			outFormat: oracledb.OUT_FORMAT_ARRAY,
		});
	} catch (error) {
		console.error('hasOpenTransaction: error', error, sql);
		return false;
	}

	if (
		!Array.isArray(result.rows) ||
		result.rows.length !== 1 ||
		!Array.isArray(result.rows[0]) ||
		result.rows[0].length !== 1 ||
		typeof result.rows[0][0] !== 'number'
	) {
		console.error('hasOpenTransaction: invalid result', result, sql);
		return false;
	}

	return result.rows[0] > 0;
};

void startServer({
	port: 8888,
	routeStatic: [
		{
			route: '/static',
			directoryPath: 'examples/static',
		},
	],
	routePlSql: [
		{
			route: '/sample',
			user: 'sample', // PlsqlDatabaseUserName
			password: 'sample', // PlsqlDatabasePassword
			connectString: process.env.WEB_PLSQL_ORACLE_SERVER ?? 'localhost:1521/TEST', // PlsqlDatabaseConnectString
			defaultPage: 'sample_pkg.page_index', // PlsqlDefaultPage
			documentTable: 'doctable', // PlsqlDocumentTablename
			exclusionList: ['sample_pkg.page_exclusion_list'], // PlsqlExclusionList
			requestValidationFunction: 'sample_pkg.request_validation_function', // PlsqlRequestValidationFunction
			pathAlias: 'myalias', // PlsqlPathAlias
			pathAliasProcedure: 'sample_pkg.page_path_alias', // PlsqlPathAliasProcedure
			transactionMode: 'commit',
			/*
			transactionMode: async (req, connection) => {
				if (await hasOpenTransaction(connection)) {
					console.log(`We detected an open transaction in "${req.originalUrl}"`);
				}
			},
			*/
			errorStyle: 'debug', // PlsqlErrorStyle
		},
	],
	loggerFilename: 'access.log', // PlsqlLogEnable and PlsqlLogDirectory
});
