#!/usr/bin/env node

import {getOptions} from './options.js';
import {server} from './server.js';

void (async () => {
	const options = await getOptions();
	await server(options);
})();
