import {existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {loadConfig, startHttpServer} from './src/server.js';

const main = async () => {
	const configFilename = process.env.WEB_PLSQL_CONFIG ?? 'config.json';
	if (configFilename.trim().length === 0 || !existsSync(configFilename)) {
		console.error(`The configuration file "${configFilename}" does not exist! Check the "WEB_PLSQL_CONFIG" environment variable.`);
		process.exit(1);
	}

	console.log(`Starting with configuration file "${configFilename}"...`);

	if (configFilename.toLowerCase().endsWith('.json')) {
		const config = loadConfig(configFilename);
		await startHttpServer(config);
	} else if (configFilename.toLowerCase().endsWith('.js')) {
		const href = pathToFileURL(configFilename).href;
		await import(href);
	} else {
		console.error(`Invalid configuration filename "${configFilename}"! The filename must end with "json" or "js".`);
		process.exit(1);
	}
};

void main();
