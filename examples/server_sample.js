#!/usr/bin/env node

import {startHttpServer} from '../src/index.js';

void startHttpServer({
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
			user: process.env.WEB_PLSQL_ORACLE_USER ?? 'sample', // PlsqlDatabaseUserName
			password: process.env.WEB_PLSQL_ORACLE_PASSWORD ?? 'sample', // PlsqlDatabasePassword
			connectString: process.env.WEB_PLSQL_ORACLE_SERVER ?? 'localhost:1521/orcl', // PlsqlDatabaseConnectString
			defaultPage: 'sample_pkg.page_index', // PlsqlDefaultPage
			documentTable: 'doctable', // PlsqlDocumentTablename
			exclusionList: ['sample_pkg.page_exclusion_list'], // PlsqlExclusionList
			requestValidationFunction: 'sample_pkg.request_validation_function', // PlsqlRequestValidationFunction
			pathAlias: 'myalias', // PlsqlPathAlias
			pathAliasProcedure: 'sample_pkg.page_path_alias', // PlsqlPathAliasProcedure
			errorStyle: 'debug', // PlsqlErrorStyle
		},
	],
	loggerFilename: 'access.log', // PlsqlLogEnable and PlsqlLogDirectory
	monitorConsole: false,
});
