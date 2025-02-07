#!/usr/bin/env node

import {startServer} from '../src/index.js';

void startServer({
	port: 80,
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
			connectString: process.env.ORACLE_SERVER ?? '', // PlsqlDatabaseConnectString
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
