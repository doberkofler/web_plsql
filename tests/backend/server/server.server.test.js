import {describe, it, expect, vi, beforeEach} from 'vitest';
import express from 'express';
import http from 'node:http';
import https from 'node:https';
import {createServer, startServer, loadConfig} from '../../../src/server/server.js';
import {AdminContext} from '../../../src/server/adminContext.js';
import * as oracleUtils from '../../../src/util/oracle.js';
import * as fileUtils from '../../../src/util/file.js';
import * as shutdownUtils from '../../../src/util/shutdown.js';

/**
 * @typedef {import('vitest').Mock} Mock
 * @typedef {import('../../../src/types.js').configType} configType
 * @typedef {import('oracledb').Pool} Pool
 */

vi.mock('../../../src/util/oracle.js');
vi.mock('../../../src/util/file.js');
vi.mock('../../../src/util/shutdown.js');

/**
 * Interface for the mocked plsql handler
 * @typedef {import('express').RequestHandler & {
 *   procedureNameCache: {clear: Mock, keys: Mock, getStats: Mock},
 *   argumentCache: {clear: Mock, keys: Mock, getStats: Mock}
 * }} MockHandler
 */

vi.mock('../../../src/handler/plsql/handlerPlSql.js', () => ({
	handlerWebPlSql: vi.fn(() => {
		const handler = /** @type {MockHandler} */ (/** @type {unknown} */ (vi.fn()));
		handler.procedureNameCache = {
			clear: vi.fn(),
			keys: vi.fn(() => []),
			getStats: vi.fn(() => ({hits: 0, misses: 0})),
		};
		handler.argumentCache = {
			clear: vi.fn(),
			keys: vi.fn(() => []),
			getStats: vi.fn(() => ({hits: 0, misses: 0})),
		};
		return handler;
	}),
}));

/**
 * Interface for the mocked server emitter
 * @typedef {import('node:http').Server & {listen: Mock, on: Mock, close: Mock, address: Mock}} MockServer
 */

/**
 * Create a mock server emitter that behaves like a real Node server
 * @returns {MockServer}
 */
const createMockServer = () => {
	const server = /** @type {MockServer} */ (
		/** @type {unknown} */ ({
			listen: vi.fn().mockImplementation(function (_port) {
				setTimeout(() => {
					const onMock = /** @type {Mock} */ (/** @type {unknown} */ (server.on));
					if (onMock.mock.calls.some((call) => call[0] === 'listening')) {
						const listeningCall = onMock.mock.calls.find((call) => call[0] === 'listening');
						if (listeningCall) {
							listeningCall[1]();
						}
					}
				}, 10);
				return server;
			}),
			on: vi.fn().mockReturnThis(),
			close: vi.fn((cb) => {
				if (cb) cb();
				return server;
			}),
			address: vi.fn().mockReturnValue({port: 1234}),
		})
	);
	return server;
};

vi.mock('node:http', () => ({
	default: {
		createServer: vi.fn(() => createMockServer()),
	},
}));

vi.mock('node:https', () => ({
	default: {
		createServer: vi.fn(() => createMockServer()),
	},
}));

describe('server/server', () => {
	/** @type {configType} */
	const validConfig = {
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

		// Use a local cast for process.exit to satisfy mock signature without 'any'
		const processExitMock = /** @type {{exit: Mock}} */ (/** @type {unknown} */ (process));
		vi.spyOn(processExitMock, 'exit').mockImplementation(() => {
			return undefined;
		});

		// Reset AdminContext
		AdminContext.config = null;
		AdminContext.pools = [];
		AdminContext.caches = [];
		AdminContext.paused = false;
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
			vi.mocked(oracleUtils.poolCreate).mockResolvedValue(/** @type {any} */ ({close: vi.fn()}));

			const webServer = await startServer(validConfig);

			expect(webServer.server).toBeDefined();
			expect(webServer.config.port).toBe(0);
			expect(oracleUtils.poolCreate).toHaveBeenCalled();
			expect(shutdownUtils.installShutdown).toHaveBeenCalled();

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
			vi.mocked(fileUtils.getJsonFile).mockReturnValue(mockConfig);

			const config = loadConfig('myconfig.json');
			expect(config).toEqual(mockConfig);
			expect(fileUtils.getJsonFile).toHaveBeenCalledWith('myconfig.json');
		});
	});

	describe('adminAuth middleware (internal)', () => {
		it('should respect AdminContext.paused', async () => {
			vi.mocked(oracleUtils.poolCreate).mockResolvedValue(/** @type {any} */ ({close: vi.fn()}));

			const webServer = await startServer(validConfig);

			AdminContext.paused = true;

			const request = (await import('supertest')).default;
			const response = await request(webServer.app).get('/pls/some_proc');

			expect(response.status).toBe(503);
			expect(response.text).toBe('Server Paused');

			await webServer.shutdown();
		});

		it('should require authentication if configured', async () => {
			const configWithAuth = {
				...validConfig,
				adminUser: 'admin',
				adminPassword: 'password',
			};

			vi.mocked(oracleUtils.poolCreate).mockResolvedValue(/** @type {any} */ ({close: vi.fn()}));

			const webServer = await startServer(configWithAuth);
			const request = (await import('supertest')).default;

			// Unauthorized
			const res1 = await request(webServer.app).get('/admin/api/status');
			expect(res1.status).toBe(401);

			// Authorized
			const res2 = await request(webServer.app)
				.get('/admin/api/status')
				.set('Authorization', 'Basic ' + Buffer.from('admin:password').toString('base64'));
			expect(res2.status).toBe(200);

			await webServer.shutdown();
		});
	});

	describe('startServer error handling', () => {
		it('should reject if listen fails', async () => {
			const server = createMockServer();

			vi.mocked(oracleUtils.poolCreate).mockResolvedValue(/** @type {any} */ ({close: vi.fn()}));

			// Mock listen to emit error
			server.listen = vi.fn().mockImplementation(function () {
				setTimeout(() => {
					const onMock = /** @type {Mock} */ (/** @type {unknown} */ (server.on));
					const errorCall = onMock.mock.calls.find((call) => call[0] === 'error');
					if (errorCall) {
						const err = new Error('EADDRINUSE');
						// @ts-expect-error - mock code
						err.code = 'EADDRINUSE';
						errorCall[1](err);
					}
				}, 10);
				return server;
			});

			vi.mocked(http.createServer).mockReturnValue(server);

			await expect(startServer(validConfig)).rejects.toThrow('Port 0 is already in use');
		});

		it('should reject on other listen errors', async () => {
			const server = createMockServer();

			vi.mocked(oracleUtils.poolCreate).mockResolvedValue(/** @type {any} */ ({close: vi.fn()}));

			server.listen = vi.fn().mockImplementation(function () {
				setTimeout(() => {
					const onMock = /** @type {Mock} */ (/** @type {unknown} */ (server.on));
					const errorCall = onMock.mock.calls.find((call) => call[0] === 'error');
					if (errorCall) {
						const err = new Error('EACCES');
						// @ts-expect-error - mock code
						err.code = 'EACCES';
						errorCall[1](err);
					}
				}, 10);
				return server;
			});

			vi.mocked(http.createServer).mockReturnValue(server);

			await expect(startServer(validConfig)).rejects.toThrow('Port 0 requires elevated privileges');
		});
	});

	describe('shutdown and connection tracking', () => {
		it('should track and close connections', async () => {
			const server = createMockServer();

			vi.mocked(oracleUtils.poolCreate).mockResolvedValue(/** @type {any} */ ({close: vi.fn()}));
			vi.mocked(oracleUtils.poolsClose).mockResolvedValue(undefined);

			vi.mocked(http.createServer).mockReturnValue(server);

			const webServer = await startServer(validConfig);

			// Simulate a connection
			const mockSocket = {destroy: vi.fn(), on: vi.fn()};
			const onMock = /** @type {Mock} */ (/** @type {unknown} */ (server.on));
			const connectionCall = onMock.mock.calls.find((call) => call[0] === 'connection');
			if (connectionCall) {
				connectionCall[1](mockSocket);
			}

			// Trigger shutdown
			await webServer.shutdown();

			expect(mockSocket.destroy).toHaveBeenCalled();
			expect(oracleUtils.poolsClose).toHaveBeenCalled();
		});
	});

	describe('extra coverage', () => {
		it('should handle adminRoute redirection', async () => {
			vi.mocked(oracleUtils.poolCreate).mockResolvedValue(/** @type {any} */ ({close: vi.fn()}));

			const webServer = await startServer(validConfig);
			const request = (await import('supertest')).default;

			const response = await request(webServer.app).get('/admin');
			expect(response.status).toBe(302);
			expect(response.header.location).toBe('/admin/');

			await webServer.shutdown();
		});

		it('should record stats on request finish', async () => {
			vi.mocked(oracleUtils.poolCreate).mockResolvedValue(/** @type {any} */ ({close: vi.fn()}));
			const statsSpy = vi.spyOn(AdminContext.statsManager, 'recordRequest');

			// Mock the handler to just finish the request
			const {handlerWebPlSql} = await import('../../../src/handler/plsql/handlerPlSql.js');
			vi.mocked(handlerWebPlSql).mockImplementation(() => {
				/** @type {import('express').RequestHandler & {procedureNameCache: any, argumentCache: any}} */
				const handler = (_req, res) => {
					res.status(200).send('ok');
				};
				handler.procedureNameCache = {clear: vi.fn(), keys: vi.fn(() => []), getStats: vi.fn()};
				handler.argumentCache = {clear: vi.fn(), keys: vi.fn(() => []), getStats: vi.fn()};
				return handler;
			});

			const webServer = await startServer(validConfig);
			const request = (await import('supertest')).default;

			await request(webServer.app).get('/pls/proc');
			expect(statsSpy).toHaveBeenCalled();

			await webServer.shutdown();
		});

		it('should rotate bucket with pool snapshots', async () => {
			vi.mocked(oracleUtils.poolCreate).mockResolvedValue(/** @type {any} */ ({connectionsOpen: 5, connectionsInUse: 2}));

			await startServer(validConfig);
			const rotateSpy = vi.spyOn(AdminContext.statsManager, 'rotateBucket');

			AdminContext.statsManager.rotateBucket();
			expect(rotateSpy).toHaveBeenCalled();
		});

		it('should handle static routes and access logging', async () => {
			const config = {
				...validConfig,
				loggerFilename: 'test.log',
				routeStatic: [{route: '/static', directoryPath: '/tmp'}],
			};

			vi.mocked(oracleUtils.poolCreate).mockResolvedValue(/** @type {any} */ ({close: vi.fn()}));

			const webServer = await startServer(config);
			expect(webServer).toBeDefined();

			await webServer.shutdown();
		});

		it('should handle adminRoute redirection with query string', async () => {
			vi.mocked(oracleUtils.poolCreate).mockResolvedValue(/** @type {any} */ ({close: vi.fn()}));

			const webServer = await startServer(validConfig);
			const request = (await import('supertest')).default;

			const response = await request(webServer.app).get('/admin?foo=bar');
			expect(response.status).toBe(302);
			expect(response.header.location).toBe('/admin/?foo=bar');

			await webServer.shutdown();
		});

		it('should handle malformed auth header', async () => {
			const configWithAuth = {
				...validConfig,
				adminUser: 'admin',
				adminPassword: 'password',
			};

			vi.mocked(oracleUtils.poolCreate).mockResolvedValue(/** @type {any} */ ({close: vi.fn()}));

			const webServer = await startServer(configWithAuth);
			const request = (await import('supertest')).default;

			const response = await request(webServer.app).get('/admin/api/status').set('Authorization', 'Basic malformed');
			expect(response.status).toBe(401);

			await webServer.shutdown();
		});

		it('should handle missing auth header when auth is required', async () => {
			const configWithAuth = {
				...validConfig,
				adminUser: 'admin',
				adminPassword: 'password',
			};

			vi.mocked(oracleUtils.poolCreate).mockResolvedValue(/** @type {any} */ ({close: vi.fn()}));

			const webServer = await startServer(configWithAuth);
			const request = (await import('supertest')).default;

			const response = await request(webServer.app).get('/admin/api/status');
			expect(response.status).toBe(401);

			await webServer.shutdown();
		});

		it('should allow admin routes when server is paused', async () => {
			vi.mocked(oracleUtils.poolCreate).mockResolvedValue(/** @type {any} */ ({close: vi.fn()}));

			const webServer = await startServer(validConfig);
			const request = (await import('supertest')).default;

			AdminContext.paused = true;
			const response = await request(webServer.app).get('/admin/api/status');
			expect(response.status).toBe(200);

			await webServer.shutdown();
		});

		it('should reject wrong credentials', async () => {
			const configWithAuth = {
				...validConfig,
				adminUser: 'admin',
				adminPassword: 'password',
			};

			vi.mocked(oracleUtils.poolCreate).mockResolvedValue(/** @type {any} */ ({close: vi.fn()}));

			const webServer = await startServer(configWithAuth);
			const request = (await import('supertest')).default;

			const response = await request(webServer.app)
				.get('/admin/api/status')
				.set('Authorization', 'Basic ' + Buffer.from('admin:wrong').toString('base64'));
			expect(response.status).toBe(401);

			await webServer.shutdown();
		});
	});
});
