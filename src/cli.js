#!/usr/bin/env node

import {getOptions} from './options.js';
import {getPackageVersion} from './version.js';
import {server} from './server.js';

void (async () => {
	const options = await getOptions();

	console.log(`Version:               ${getPackageVersion()}`);
	console.log(`Server home page:      http://localhost:${options.port}${options.routeStatic}`);
	console.log(`Static resources dir:  ${options.routeStaticPath}`);
	console.log(`Oracle user:           ${options.user}`);
	console.log(`Oracle server:         ${options.connectString}`);
	console.log(`Oracle document table: ${options.documentTable}`);
	console.log(`Access log:            ${options.loggerFilename}`);

	await server(options);
})();
