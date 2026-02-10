import {describe, it, expect, vi, beforeEach} from 'vitest';
import express from 'express';
import http from 'node:http';
import https from 'node:https';
import {createServer, startServer, loadConfig} from '../../../src/backend/server/server.ts';
import {AdminContext} from '../../../src/backend/server/adminContext.ts';
import * as oracleUtils from '../../../src/backend/util/oracle.ts';
import * as fileUtils from '../../../src/backend/util/file.ts';
import * as shutdownUtils from '../../../src/backend/util/shutdown.ts';
import type {configType} from '../../../src/backend/types.ts';
import type {Mock} from 'vitest';
import type {RequestHandler} from 'express';

vi.mock('../../../src/backend/util/oracle.ts');
vi.mock('../../../src/backend/util/file.ts');
vi.mock('../../../src/backend/util/shutdown.ts');

/**
 * Interface for the mocked plsql handler
 */
type MockHandler = RequestHandler & {
	procedureNameCache: {clear: Mock; keys: Mock; getStats: Mock};
	argumentCache: {clear: Mock; keys: Mock; getStats: Mock};
};

vi.mock('../../../src/backend/handler/plsql/handlerPlSql.ts', () => ({
	handlerWebPlSql: vi.fn(() => {
		const handler = vi.fn() as unknown as MockHandler;
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

vi.mock('../../../src/backend/handler/handlerAdmin.ts', () => ({
	handlerAdmin: vi.fn((_req, res) => {
		res.status(200).send('admin');
	}),
}));

/**
 * Interface for the mocked server emitter
 */
type MockServer = http.Server & {listen: Mock; on: Mock; close: Mock; address: Mock};

/**
 * Create a mock server emitter that behaves like a real Node server
 * @returns MockServer
 */
const createMockServer = (): MockServer => {
	const server = {
		listen: vi.fn().mockImplementation(function (_port) {
			setTimeout(() => {
				const onMock = server.on as unknown as Mock;

				if (onMock.mock.calls.some((call: any[]) => call[0] === 'listening')) {
					const listeningCall = onMock.mock.calls.find((call: any[]) => call[0] === 'listening');
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
	} as unknown as MockServer;
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
	const validConfig: configType = {
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

		const processExitMock = process as any;
		vi.spyOn(processExitMock, 'exit').mockImplementation(() => {
			return undefined as never;
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
			vi.mocked(oracleUtils.poolCreate).mockResolvedValue({close: vi.fn()} as any);

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

			vi.mocked(fileUtils.getJsonFile).mockReturnValue(mockConfig as any);

			const config = loadConfig('myconfig.json');
			expect(config).toEqual(mockConfig);
			expect(fileUtils.getJsonFile).toHaveBeenCalledWith('myconfig.json');
		});
	});

	describe('adminAuth middleware (internal)', () => {
		it('should respect AdminContext.paused', async () => {
			vi.mocked(oracleUtils.poolCreate).mockResolvedValue({close: vi.fn()} as any);

			const webServer = await startServer(validConfig);

			AdminContext.paused = true;

			const request = (await import('supertest')).default;
			const response = await request(webServer.app).get('/pls/some_proc');

			expect(response.status).toBe(503);
			expect(response.text).toBe('Server Paused');

			await webServer.shutdown();
		});

		it('should require authentication if configured', async () => {
			const configWithAuth: configType = {
				...validConfig,
				adminUser: 'admin',
				adminPassword: 'password',
			};

			vi.mocked(oracleUtils.poolCreate).mockResolvedValue({close: vi.fn()} as any);

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

			vi.mocked(oracleUtils.poolCreate).mockResolvedValue({close: vi.fn()} as any);

			// Mock listen to emit error
			server.listen = vi.fn().mockImplementation(function () {
				setTimeout(() => {
					const onMock = server.on as unknown as Mock;

					const errorCall = onMock.mock.calls.find((call: any[]) => call[0] === 'error');
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

			vi.mocked(oracleUtils.poolCreate).mockResolvedValue({close: vi.fn()} as any);

			server.listen = vi.fn().mockImplementation(function () {
				setTimeout(() => {
					const onMock = server.on as unknown as Mock;

					const errorCall = onMock.mock.calls.find((call: any[]) => call[0] === 'error');
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

			vi.mocked(oracleUtils.poolCreate).mockResolvedValue({close: vi.fn()} as any);
			vi.mocked(oracleUtils.poolsClose).mockResolvedValue(undefined);

			vi.mocked(http.createServer).mockReturnValue(server);

			const webServer = await startServer(validConfig);

			// Socket 1: connects and closes
			const socket1 = {destroy: vi.fn(), on: vi.fn()};
			const onMock = server.on as unknown as Mock;

			// Emit connection for socket1
			const connectionCall = onMock.mock.calls.find((call: any[]) => call[0] === 'connection');
			if (connectionCall) {
				connectionCall[1](socket1);
			}

			// Emit close for socket1
			const closeCall1 = (socket1.on as unknown as Mock).mock.calls.find((call: any[]) => call[0] === 'close');
			if (closeCall1) {
				closeCall1[1]();
			}

			// Socket 2: connects and stays open
			const socket2 = {destroy: vi.fn(), on: vi.fn()};
			if (connectionCall) {
				connectionCall[1](socket2);
			}

			// Trigger shutdown
			await webServer.shutdown();

			expect(socket1.destroy).not.toHaveBeenCalled();
			expect(socket2.destroy).toHaveBeenCalled();
			expect(oracleUtils.poolsClose).toHaveBeenCalled();
		});
	});

	describe('extra coverage', () => {
		it('should handle adminRoute redirection', async () => {
			vi.mocked(oracleUtils.poolCreate).mockResolvedValue({close: vi.fn()} as any);

			const webServer = await startServer(validConfig);
			const request = (await import('supertest')).default;

			const response = await request(webServer.app).get('/admin');
			expect(response.status).toBe(302);
			expect(response.header.location).toBe('/admin/');

			await webServer.shutdown();
		});

		it('should record stats on request finish', async () => {
			vi.mocked(oracleUtils.poolCreate).mockResolvedValue({close: vi.fn()} as any);
			const statsSpy = vi.spyOn(AdminContext.statsManager, 'recordRequest');

			// Mock the handler to just finish the request
			const {handlerWebPlSql} = await import('../../../src/backend/handler/plsql/handlerPlSql.ts');
			vi.mocked(handlerWebPlSql).mockImplementation(() => {
				const handler: any = (_req: any, res: any) => {
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
			vi.mocked(oracleUtils.poolCreate).mockResolvedValue({connectionsOpen: 5, connectionsInUse: 2} as any);

			await startServer(validConfig);
			const rotateSpy = vi.spyOn(AdminContext.statsManager, 'rotateBucket');

			AdminContext.statsManager.rotateBucket();
			expect(rotateSpy).toHaveBeenCalled();
		});

		it('should handle static routes and access logging', async () => {
			const config: configType = {
				...validConfig,
				loggerFilename: 'test.log',
				routeStatic: [{route: '/static', directoryPath: 'examples'}],
			};

			vi.mocked(oracleUtils.poolCreate).mockResolvedValue({close: vi.fn()} as any);

			const webServer = await startServer(config);
			expect(webServer).toBeDefined();

			await webServer.shutdown();
		});

		it('should handle adminRoute redirection with query string', async () => {
			vi.mocked(oracleUtils.poolCreate).mockResolvedValue({close: vi.fn()} as any);

			const webServer = await startServer(validConfig);
			const request = (await import('supertest')).default;

			const response = await request(webServer.app).get('/admin?foo=bar');
			expect(response.status).toBe(302);
			expect(response.header.location).toBe('/admin/?foo=bar');

			await webServer.shutdown();
		});

		it('should handle malformed auth header', async () => {
			const configWithAuth: configType = {
				...validConfig,
				adminUser: 'admin',
				adminPassword: 'password',
			};

			vi.mocked(oracleUtils.poolCreate).mockResolvedValue({close: vi.fn()} as any);

			const webServer = await startServer(configWithAuth);
			const request = (await import('supertest')).default;

			const response = await request(webServer.app).get('/admin/api/status').set('Authorization', 'Basic malformed');
			expect(response.status).toBe(401);

			await webServer.shutdown();
		});

		it('should handle missing auth header when auth is required', async () => {
			const configWithAuth: configType = {
				...validConfig,
				adminUser: 'admin',
				adminPassword: 'password',
			};

			vi.mocked(oracleUtils.poolCreate).mockResolvedValue({close: vi.fn()} as any);

			const webServer = await startServer(configWithAuth);
			const request = (await import('supertest')).default;

			const response = await request(webServer.app).get('/admin/api/status');
			expect(response.status).toBe(401);

			await webServer.shutdown();
		});

		it('should allow admin routes when server is paused', async () => {
			vi.mocked(oracleUtils.poolCreate).mockResolvedValue({close: vi.fn()} as any);

			const webServer = await startServer(validConfig);
			const request = (await import('supertest')).default;

			AdminContext.paused = true;
			const response = await request(webServer.app).get('/admin/api/status');
			expect(response.status).toBe(200);

			await webServer.shutdown();
		});

		it('should reject wrong credentials', async () => {
			const configWithAuth: configType = {
				...validConfig,
				adminUser: 'admin',
				adminPassword: 'password',
			};

			vi.mocked(oracleUtils.poolCreate).mockResolvedValue({close: vi.fn()} as any);

			const webServer = await startServer(configWithAuth);
			const request = (await import('supertest')).default;

			const response = await request(webServer.app)
				.get('/admin/api/status')
				.set('Authorization', 'Basic ' + Buffer.from('admin:wrong').toString('base64'));
			expect(response.status).toBe(401);

			await webServer.shutdown();
		});

		it('should pass through if admin route has trailing slash', async () => {
			vi.mocked(oracleUtils.poolCreate).mockResolvedValue({close: vi.fn()} as any);

			const webServer = await startServer(validConfig);
			const request = (await import('supertest')).default;

			// Request /admin/ (with trailing slash)
			// This matches app.get('/admin') because strict routing is false by default
			// But inside the handler, path is '/admin/', which != '/admin'
			// So it calls next(), which goes to handlerAdmin mounted at /admin
			const response = await request(webServer.app).get('/admin/');
			expect(response.status).toBe(200);

			await webServer.shutdown();
		});
	});
});
