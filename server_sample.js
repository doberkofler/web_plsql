#!/usr/bin/env node

import {startServer} from './src/server.js';

void startServer({
	port: 8080,
	routeStatic: [
		{
			route: '/static',
			directoryPath: 'examples/static',
		},
	],
	routePlSql: [
		{
			route: '/base',
			user: 'sample',
			password: 'sample',
			connectString: process.env.ORACLE_SERVER ?? '',
			defaultPage: 'sample.pageIndex',
			pathAlias: {
				alias: 'myalias',
				procedure: 'sample.pagePathAlias',
			},
			documentTable: 'doctable',
		},
	],
	errorStyle: 'debug',
	loggerFilename: 'access.log',
	monitorConsole: false,
});
