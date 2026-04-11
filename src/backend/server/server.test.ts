import {describe, it, expect, vi, beforeEach} from 'vitest';
import express from 'express';
import type {Mock} from 'vitest';
import type {RequestHandler} from 'express';

vi.mock('node:http', () => {
	type MockServer = {
		listen: () => MockServer;
		on: () => MockServer;
		close: (cb?: () => void) => MockServer;
		address: () => {port: number};
	};
	const server: MockServer = {
		listen: vi.fn<() => MockServer>().mockReturnThis(),
		on: vi.fn<() => MockServer>().mockReturnThis(),
		close: vi.fn<(cb?: () => void) => MockServer>((cb) => {
			if (cb) cb();
			return server;
		}),
		address: vi.fn<() => {port: number}>().mockReturnValue({port: 1234}),
	};
	return {
		createServer: vi.fn<() => MockServer>(() => server),
		default: {
			createServer: vi.fn<() => MockServer>(() => server),
		},
	};
});

vi.mock('node:https', () => {
	type MockServer = {
		listen: () => MockServer;
		on: () => MockServer;
		close: (cb?: () => void) => MockServer;
		address: () => {port: number};
	};
	const server: MockServer = {
		listen: vi.fn<() => MockServer>().mockReturnThis(),
		on: vi.fn<() => MockServer>().mockReturnThis(),
		close: vi.fn<(cb?: () => void) => MockServer>((cb) => {
			if (cb) cb();
			return server;
		}),
		address: vi.fn<() => {port: number}>().mockReturnValue({port: 1234}),
	};
	return {
		createServer: vi.fn<() => MockServer>(() => server),
		default: {
			createServer: vi.fn<() => MockServer>(() => server),
		},
	};
});

vi.mock('oracledb', () => ({
	default: {
		createPool: vi.fn<(...args: unknown[]) => unknown>(),
		BIND_IN: 1,
		BIND_OUT: 2,
		BIND_INOUT: 3,
		STRING: 4,
		NUMBER: 5,
		DATE: 6,
		CURSOR: 7,
		BUFFER: 8,
		CLOB: 9,
		BLOB: 10,
		DB_TYPE_VARCHAR: 11,
		DB_TYPE_CLOB: 12,
		DB_TYPE_NUMBER: 13,
		DB_TYPE_DATE: 14,
	},
}));

import {createServer, startServer, loadConfig} from '../server/server.ts';
import oracledb from 'oracledb';
import * as fileUtils from '../util/file.ts';
import * as shutdownUtils from '../util/shutdown.ts';
import type {configInputType} from '../types.ts';
import http from 'node:http';
import https from 'node:https';

vi.mock('../util/file.ts');
vi.mock('../util/shutdown.ts');

type MockHandler = RequestHandler & {
	procedureNameCache: {clear: Mock; keys: Mock; getStats: Mock};
	argumentCache: {clear: Mock; keys: Mock; getStats: Mock};
};

vi.mock('../handler/plsql/handlerPlSql.ts', () => ({
	handlerWebPlSql: vi.fn<() => MockHandler>(() => {
		const handler = vi.fn<RequestHandler>() as unknown as MockHandler;
		handler.procedureNameCache = {
			clear: vi.fn<() => void>(),
			keys: vi.fn<() => string[]>(() => []),
			getStats: vi.fn<() => {hits: number; misses: number}>(() => ({hits: 0, misses: 0})),
		};
		handler.argumentCache = {
			clear: vi.fn<() => void>(),
			keys: vi.fn<() => string[]>(() => []),
			getStats: vi.fn<() => {hits: number; misses: number}>(() => ({hits: 0, misses: 0})),
		};
		return handler;
	}),
}));

vi.mock('../handler/handlerAdmin.ts', () => ({
	createAdminRouter: vi.fn<() => ReturnType<typeof express.Router>>(() => {
		const router = express.Router();
		router.all('/', (_req, res) => {
			res.status(200).send('admin');
		});
		return router;
	}),
}));

describe('server/server', () => {
	const validConfig: configInputType = {
		port: 0,
		adminRoute: '/admin',
		loggerFilename: '',
		uploadFileSizeLimit: 1024,
		routeStatic: [],
		routePlSql: [
			{
				route: '/pls',
				user: 'scott',
				password: 'tiger',
				connectString: 'localhost/xe',
				documentTable: 'docs',
				defaultPage: 'home',
				errorStyle: 'basic',
			},
		],
	};

	beforeEach(() => {
		vi.clearAllMocks();
		const processExitMock = process as any;
		vi.spyOn(processExitMock, 'exit').mockImplementation(() => {
			return undefined as never;
		});
		vi.mocked(oracledb.createPool).mockResolvedValue({close: vi.fn<(...args: unknown[]) => unknown>()} as any);
	});

	describe('createServer', () => {
		it('should create an HTTP server when no SSL config is provided', () => {
			const app = express();
			const server = createServer(app);
			expect(server).toBeDefined();
			expect(http.createServer).toHaveBeenCalled();
		});

		it('should create an HTTPS server when SSL config is provided', () => {
			const app = express();
			const ssl = {keyFilename: 'key.pem', certFilename: 'cert.pem'};
			vi.mocked(fileUtils.readFileSyncUtf8).mockReturnValue('dummy pem');
			const server = createServer(app, ssl);
			expect(server).toBeDefined();
			expect(https.createServer).toHaveBeenCalled();
		});
	});

	describe('startServer', () => {
		it('should start a server with valid config', async () => {
			const server = (http.createServer as Mock)();
			// Immediately trigger listening
			server.on.mockImplementation(function (event: string, callback: any) {
				if (event === 'listening') {
					process.nextTick(callback);
				}
				return server;
			});

			const webServer = await startServer(validConfig);
			expect(webServer.server).toBeDefined();
			expect(oracledb.createPool).toHaveBeenCalled();
			expect(shutdownUtils.installShutdown).toHaveBeenCalled();
			await webServer.shutdown();
		});

		it('should call setupExtensions if provided', async () => {
			const server = (http.createServer as Mock)();
			server.on.mockImplementation(function (event: string, callback: any) {
				if (event === 'listening') {
					process.nextTick(callback);
				}
				return server;
			});

			const setupExtensions = vi.fn<(app: unknown, pools: unknown) => void>();
			const configWithExtensions = {...validConfig, setupExtensions};

			const webServer = await startServer(configWithExtensions);
			expect(setupExtensions).toHaveBeenCalledWith(expect.anything(), webServer.connectionPools);
			await webServer.shutdown();
		});
	});

	describe('loadConfig', () => {
		it('should load config from file', () => {
			const mockConfig = {
				port: 8080,
				loggerFilename: '',
				routeStatic: [],
				routePlSql: [],
			};
			vi.mocked(fileUtils.getJsonFile).mockReturnValue(mockConfig as any);
			const config = loadConfig('myconfig.json');
			expect(config).toEqual({
				...mockConfig,
				oracle: {
					poolMin: 10,
					poolMax: 100,
					poolIncrement: 10,
				},
			});
		});
	});

	describe('adminAuth middleware (internal)', () => {
		it('should respect adminContext.paused', async () => {
			const serverMock = (http.createServer as Mock)();
			serverMock.on.mockImplementation(function (event: string, callback: any) {
				if (event === 'listening') {
					process.nextTick(callback);
				}
				return serverMock;
			});

			const webServer = await startServer(validConfig);
			webServer.adminContext.setPaused(true);
			const request = (await import('supertest')).default;
			const response = await request(webServer.app).get('/pls/some_proc');
			expect(response.status).toBe(503);
			await webServer.shutdown();
		});
	});

	describe('startServer error handling', () => {
		it('should reject if listen fails', async () => {
			const server = (http.createServer as Mock)();
			server.on.mockImplementation(function (event: string, callback: any) {
				if (event === 'error') {
					process.nextTick(() => callback(Object.assign(new Error('EADDRINUSE'), {code: 'EADDRINUSE'})));
				}
				return server;
			});

			await expect(startServer(validConfig)).rejects.toThrow('Port 0 is already in use');
		});

		it('should reject on other listen errors', async () => {
			const server = (http.createServer as Mock)();
			server.on.mockImplementation(function (event: string, callback: any) {
				if (event === 'error') {
					process.nextTick(() => callback(Object.assign(new Error('EACCES'), {code: 'EACCES'})));
				}
				return server;
			});

			await expect(startServer(validConfig)).rejects.toThrow('Port 0 requires elevated privileges');
		});
	});

	describe('shutdown and connection tracking', () => {
		it('should track and close connections', async () => {
			const server = (http.createServer as Mock)();
			let connectionCallback: any;
			server.on.mockImplementation(function (event: string, callback: any) {
				if (event === 'listening') {
					process.nextTick(callback);
				}
				if (event === 'connection') {
					connectionCallback = callback;
				}
				return server;
			});

			const webServer = await startServer(validConfig);
			const socket1 = {destroy: vi.fn<(...args: unknown[]) => unknown>(), on: vi.fn<(...args: unknown[]) => unknown>()};
			const socket2 = {destroy: vi.fn<(...args: unknown[]) => unknown>(), on: vi.fn<(...args: unknown[]) => unknown>()};

			if (connectionCallback) {
				connectionCallback(socket1);
				const closeCall1 = (socket1.on as Mock).mock.calls.find((call: any[]) => call[0] === 'close');
				if (closeCall1) {
					closeCall1[1]();
				}
				connectionCallback(socket2);
			}

			await webServer.shutdown();
			expect(socket1.destroy).not.toHaveBeenCalled();
			expect(socket2.destroy).toHaveBeenCalled();
		});
	});
});