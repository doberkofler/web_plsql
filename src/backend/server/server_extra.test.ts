import {describe, it, expect, vi} from 'vitest';
import {startServer} from './server.js';
import type {configInputType} from '../types.js';

const mocks = vi.hoisted(() => {
	return {
		useMock: vi.fn<(...args: unknown[]) => unknown>(),
		handlerLogger: vi.fn<(...args: unknown[]) => unknown>(() => 'loggerMiddleware'),
		createSpaFallback: vi.fn<(...args: unknown[]) => unknown>(() => 'spaFallbackMiddleware'),
		handlerWebPlSql: vi.fn<(...args: unknown[]) => unknown>(() => vi.fn<(...args: unknown[]) => unknown>()),
	};
});

vi.mock('cors', () => ({default: vi.fn<() => string>(() => 'corsMiddleware')}));
vi.mock('cookie-parser', () => ({default: vi.fn<() => string>(() => 'cookieMiddleware')}));
vi.mock('compression', () => ({default: vi.fn<() => string>(() => 'compressionMiddleware')}));

// Mock express
vi.mock('express', () => {
	const app = {
		use: mocks.useMock,
		on: vi.fn<(...args: unknown[]) => unknown>(),
	};
	const expressFn = () => app;
	(expressFn as any).json = vi.fn<(...args: unknown[]) => unknown>(() => 'jsonMiddleware');
	(expressFn as any).urlencoded = vi.fn<(...args: unknown[]) => unknown>(() => 'urlencodedMiddleware');
	return {
		default: expressFn,
	};
});

// Mock http
vi.mock('node:http', () => {
	const createServer = () => ({
		listen: () => ({
			on: (event: string, cb: any) => {
				if (event === 'listening') cb();
				return {on: () => undefined};
			},
		}),
		on: () => undefined,
		close: (cb: any) => cb(),
	});
	return {
		createServer,
		default: {
			createServer,
		},
	};
});

// Mock oracledb
vi.mock('oracledb', () => ({
	default: {
		createPool: () => Promise.resolve({close: () => undefined}),
	},
}));

// Mock dependencies from index.ts
vi.mock('../index.ts', async () => {
	const actual = (await vi.importActual('../index.ts')) as any;
	return {
		...actual,
		handlerLogger: mocks.handlerLogger,
		createSpaFallback: mocks.createSpaFallback,
		handlerUpload: vi.fn<(...args: unknown[]) => unknown>(() => 'uploadMiddleware'),
		handlerAdminConsole: vi.fn<(...args: unknown[]) => unknown>(() => 'adminConsoleMiddleware'),
		handlerWebPlSql: mocks.handlerWebPlSql,
		printBanner: vi.fn<(...args: unknown[]) => unknown>(),
		installShutdown: vi.fn<(...args: unknown[]) => unknown>(),
	};
});

vi.mock('express-static-gzip', () => ({
	default: vi.fn<(...args: unknown[]) => unknown>(() => 'staticMiddleware'),
}));

describe('server/server_extra', () => {
	it('should mount logger, spa fallback and handle plsql stats', async () => {
		const config: configInputType = {
			port: 3000,
			accessLogFilename: 'access.log',
			devMode: true,
			routeStatic: [
				{
					route: '/app',
					directoryPath: './public',
					spaFallback: true,
				},
			],
			routePlSql: [
				{
					route: '/pls',
					user: 'scott',
					password: 'tiger',
					connectString: 'localhost:1521/xe',
					documentTable: 'docs',
					defaultPage: 'home',
					errorStyle: 'basic',
				},
			],
			adminRoute: '/admin',
			adminUser: 'admin',
			adminPassword: 'password',
			setupRawExtensions: (app) => {
				app.use('rawExtensionMiddleware');
			},
			setupExtensions: (app) => {
				app.use('extensionMiddleware');
			},
		};

		const {adminContext} = await startServer(config);

		// Verify handlerLogger was called
		expect(mocks.handlerLogger).toHaveBeenCalledWith('access.log');

		// Verify createSpaFallback was called
		expect(mocks.createSpaFallback).toHaveBeenCalledWith('./public', '/app');

		// Verify app.use was called with these middlewares
		expect(mocks.useMock).toHaveBeenCalledWith('loggerMiddleware');
		expect(mocks.useMock).toHaveBeenCalledWith('/app', 'spaFallbackMiddleware');
		const loggerIndex = mocks.useMock.mock.calls.findIndex((call) => call[0] === 'loggerMiddleware');
		const corsIndex = mocks.useMock.mock.calls.findIndex((call) => call[0] === 'corsMiddleware');
		const rawExtensionIndex = mocks.useMock.mock.calls.findIndex((call) => call[0] === 'rawExtensionMiddleware');
		const uploadIndex = mocks.useMock.mock.calls.findIndex((call) => call[0] === 'uploadMiddleware');
		const jsonIndex = mocks.useMock.mock.calls.findIndex((call) => call[0] === 'jsonMiddleware');
		const urlencodedIndex = mocks.useMock.mock.calls.findIndex((call) => call[0] === 'urlencodedMiddleware');
		const cookieIndex = mocks.useMock.mock.calls.findIndex((call) => call[0] === 'cookieMiddleware');
		const compressionIndex = mocks.useMock.mock.calls.findIndex((call) => call[0] === 'compressionMiddleware');
		const adminIndex = mocks.useMock.mock.calls.findIndex((call) => call[0] === 'adminConsoleMiddleware');
		const plSqlIndex = mocks.useMock.mock.calls.findIndex((call) => Array.isArray(call[0]) && call[0].includes('/pls'));
		const extensionIndex = mocks.useMock.mock.calls.findIndex((call) => call[0] === 'extensionMiddleware');
		const staticIndex = mocks.useMock.mock.calls.findIndex((call) => call[1] === 'staticMiddleware');
		expect(loggerIndex).toBeGreaterThanOrEqual(0);
		expect(loggerIndex).toBeLessThan(corsIndex);
		expect(corsIndex).toBeLessThan(rawExtensionIndex);
		expect(rawExtensionIndex).toBeLessThan(uploadIndex);
		expect(uploadIndex).toBeLessThan(jsonIndex);
		expect(jsonIndex).toBeLessThan(urlencodedIndex);
		expect(urlencodedIndex).toBeLessThan(cookieIndex);
		expect(cookieIndex).toBeLessThan(compressionIndex);
		expect(compressionIndex).toBeLessThan(adminIndex);
		expect(adminIndex).toBeLessThan(plSqlIndex);
		expect(plSqlIndex).toBeLessThan(extensionIndex);
		expect(extensionIndex).toBeLessThan(staticIndex);

		// Find the PL/SQL middleware
		const plSqlCall = mocks.useMock.mock.calls.find((call) => {
			const route = call[0];
			return Array.isArray(route) && route.includes('/pls');
		});

		expect(plSqlCall).toBeDefined();
		if (!plSqlCall) throw new Error('plSqlCall is undefined');
		type StatsMiddleware = (req: object, res: {on: (event: string, callback: () => void) => void; statusCode: number}, next: () => void) => void;
		const middleware = plSqlCall[1] as StatsMiddleware;

		// Test the stats middleware
		const req = {};
		const res = {
			on: vi.fn<(event: string, callback: () => void) => void>(),
			statusCode: 200,
		};
		const next = vi.fn<() => void>();

		middleware(req, res, next);

		// Check if 'finish' listener was added
		expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));

		// Simulate finish event
		const finishCall = res.on.mock.calls.find((call) => call[0] === 'finish');
		if (!finishCall) throw new Error('finish listener not added');
		const finishCallback = finishCall[1] as () => void;

		// Spy on adminContext.statsManager.recordRequest
		const recordSpy = vi.spyOn(adminContext.statsManager, 'recordRequest');
		recordSpy.mockImplementation(() => undefined);

		finishCallback();

		expect(recordSpy).toHaveBeenCalled();
		expect(mocks.handlerWebPlSql).toHaveBeenCalled();
	});
});