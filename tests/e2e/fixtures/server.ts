import {test as base} from '@playwright/test';
import type {webServer} from '../../../src/backend/server/server.ts';
import {startServer} from '../../../src/backend/server/server.ts';
import type {configType} from '../../../src/backend/types.ts';
import pkg from '../../../package.json' with {type: 'json'};

// @ts-expect-error - __VERSION__ is injected at build time
globalThis.__VERSION__ = pkg.version;

// Enable mock oracle
process.env.MOCK_ORACLE = 'true';

type ServerFixture = {
	server: webServer;
	baseURL: string;
};

const config: configType = {
	port: 8082,
	routeStatic: [],
	routePlSql: [
		{
			route: '/pls',
			user: 'test',
			password: 'test',
			connectString: 'localhost:1521/TEST',
			defaultPage: 'test.page',
			documentTable: 'docs',
			errorStyle: 'debug',
		},
	],
	loggerFilename: '',
	adminRoute: '/admin',
};

export const test = base.extend<ServerFixture>({
	// eslint-disable-next-line no-empty-pattern -- Playwright fixture pattern requires empty destructuring
	server: async ({}, use) => {
		const server = await startServer(config);
		await use(server);

		// Clean shutdown for tests: close server and pools, skip process.exit
		await Promise.all(server.connectionPools.map((pool) => pool.close(0)));
		await new Promise<void>((resolve) => {
			server.server.close(() => resolve());
			// Force close after 500ms if callback not called
			setTimeout(resolve, 500);
		});
	},
	baseURL: async ({server}, use) => {
		await use(`http://localhost:${server.config.port}`);
	},
});

export {expect} from '@playwright/test';
