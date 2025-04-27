#!/usr/bin/env node

// @ts-expect-error NOTE: the following import would show an error because the path does not exist
import {startHttpServer} from './src/index.js';

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
			user: 'sample', // PlsqlDatabaseUserName
			password: 'sample', // PlsqlDatabasePassword
			connectString: 'host.docker.internal:1521/TEST', // PlsqlDatabaseConnectString
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
