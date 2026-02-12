import {startServer} from '../src/index.ts';

void startServer({
	port: 80,
	routeStatic: [
		{
			route: '/i/',
			directoryPath: 'apex/images',
		},
	],
	routePlSql: [
		{
			route: '/apex',
			user: 'APEX_PUBLIC_USER',
			password: 'secret',
			connectString: 'localhost:1521/orcl',
			defaultPage: 'apex',
			pathAlias: 'r',
			pathAliasProcedure: 'wwv_flow.resolve_friendly_url',
			documentTable: 'wwv_flow_file_objects$',
			errorStyle: 'debug',
		},
	],
	loggerFilename: 'access.log',
});
