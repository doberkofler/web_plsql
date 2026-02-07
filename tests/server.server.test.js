import {describe, it, expect, vi, beforeEach} from 'vitest';
import express from 'express';
import http from 'node:http';
import https from 'node:https';
import {AdminContext, createServer, startServer, loadConfig} from '../src/server/server.js';
import * as oracleUtils from '../src/util/oracle.js';
import * as fileUtils from '../src/util/file.js';
import * as shutdownUtils from '../src/util/shutdown.js';

/**
 * @typedef {import('vitest').Mock} Mock
 * @typedef {import('../src/types.js').configType} configType
 * @typedef {import('oracledb').Pool} Pool
 */

vi.mock('../src/util/oracle.js');
vi.mock('../src/util/file.js');
vi.mock('../src/util/shutdown.js');

/**
 * Interface for the mocked plsql handler
 * @typedef {import('express').RequestHandler & {procedureNameCache: {clear: Mock}, argumentCache: {clear: Mock}}} MockHandler
 */

vi.mock('../src/handler/plsql/handlerPlSql.js', () => ({
	handlerWebPlSql: vi.fn(() => {
		const handler = /** @type {MockHandler} */ (/** @type {unknown} */ (vi.fn()));
		handler.procedureNameCache = {clear: vi.fn()};
		handler.argumentCache = {clear: vi.fn()};
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
		AdminContext.metrics = {requestCount: 0, errorCount: 0};
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

			const fileUtilsMock = /** @type {{readFileSyncUtf8: Mock}} */ (/** @type {unknown} */ (fileUtils));
			fileUtilsMock.readFileSyncUtf8.mockReturnValue('dummy pem');

			const server = createServer(app, ssl);
			expect(server).toBeDefined();
			expect(https.createServer).toHaveBeenCalled();
		});
	});

	describe('startServer', () => {
		it('should start a server with valid config', async () => {
			const oracleUtilsMock = /** @type {{poolCreate: Mock}} */ (/** @type {unknown} */ (oracleUtils));
			oracleUtilsMock.poolCreate.mockResolvedValue({close: vi.fn()});

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
			const fileUtilsMock = /** @type {{getJsonFile: Mock}} */ (/** @type {unknown} */ (fileUtils));
			fileUtilsMock.getJsonFile.mockReturnValue(mockConfig);

			const config = loadConfig('myconfig.json');
			expect(config).toEqual(mockConfig);
			expect(fileUtils.getJsonFile).toHaveBeenCalledWith('myconfig.json');
		});
	});

	describe('adminAuth middleware (internal)', () => {
		it('should respect AdminContext.paused', async () => {
			const oracleUtilsMock = /** @type {{poolCreate: Mock}} */ (/** @type {unknown} */ (oracleUtils));
			oracleUtilsMock.poolCreate.mockResolvedValue({close: vi.fn()});

			const webServer = await startServer(validConfig);

			AdminContext.paused = true;

			const request = (await import('supertest')).default;
			const response = await request(webServer.app).get('/pls/some_proc');

			expect(response.status).toBe(503);
			expect(response.text).toBe('Server Paused');

			await webServer.shutdown();
		});
	});
});
