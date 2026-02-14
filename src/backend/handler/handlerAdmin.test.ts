import {describe, it, expect, vi, beforeEach} from 'vitest';
import express, {type Express} from 'express';
import request from 'supertest';
import {AdminContext} from '../server/adminContext.ts';
import {createAdminRouter} from '../handler/handlerAdmin.ts';
import {StatsManager} from '../util/statsManager.ts';
import * as shutdownUtils from '../util/shutdown.ts';
import fs from 'node:fs';
import type {Cache} from '../util/cache.ts';

vi.mock('../util/shutdown.ts');

// Mock readline here
vi.mock('node:readline', () => ({
	default: {
		createInterface: vi.fn(() => ({
			[Symbol.asyncIterator]: async function* () {
				await Promise.resolve(null);
				yield 'line 1';
				yield 'line 2';
			},
		})),
	},
}));

describe('handler/handlerAdmin', () => {
	let app: Express;
	let adminContext: AdminContext;

	beforeEach(() => {
		vi.clearAllMocks();
		// Spy on fs methods instead of global mock
		vi.spyOn(fs, 'existsSync').mockReturnValue(false);

		vi.spyOn(fs, 'createReadStream').mockReturnValue({} as any);

		const mockConfig = {
			port: 8080,
			adminRoute: '/admin',
			loggerFilename: 'access.log',
			routeStatic: [],
			routePlSql: [
				{
					route: '/pls',
					user: 'scott',
					password: 'tiger',
					connectString: 'xe',
					documentTable: 'docs',
					defaultPage: 'home',
					errorStyle: 'basic',
					auth: {type: 'basic', callback: vi.fn(), realm: 'test'},
					transactionMode: vi.fn(),
					cgi: {TEST: 'value'},
				},
			],
		};

		adminContext = new AdminContext(mockConfig as any);
		adminContext.statsManager.stop();
		// @ts-expect-error - overriding statsManager for testing
		adminContext.statsManager = new StatsManager({
			intervalMs: 1000,
			maxHistoryPoints: 5,
			sampleSystem: false,
		});

		app = express();
		app.use(express.json());
		app.use('/admin', createAdminRouter(adminContext));

		adminContext.statsManager.recordRequest(100, false);
		adminContext.statsManager.recordRequest(200, true);
	});

	describe('GET /api/status', () => {
		it('should return server status without config by default', async () => {
			const res = await request(app).get('/admin/api/status');
			expect(res.status).toBe(200);
			expect(res.body.version).toBeDefined();
			expect(res.body.status).toBe('running');
			expect(res.body.metrics.requestCount).toBe(2);
			expect(res.body.config).toBeUndefined();
			// Verify cache stats are present
			expect(res.body.pools).toBeDefined();
			if (res.body.pools.length > 0) {
				expect(res.body.pools[0].cache).toBeDefined();
				expect(res.body.pools[0].cache.procedureName).toBeDefined();
			}
		});

		it('should return server status with config when requested and strip sensitive fields', async () => {
			const res = await request(app).get('/admin/api/status?config=true');
			expect(res.status).toBe(200);
			expect(res.body.config).toBeDefined();
			expect(res.body.config.routePlSql[0].password).toBe('********');

			// Verify fields are stripped
			expect(res.body.config.routePlSql[0].auth).toBeUndefined();
			expect(res.body.config.routePlSql[0].transactionMode).toBeUndefined();
			expect(res.body.config.routePlSql[0].cgi).toBeUndefined();

			// Verify flags are present
			expect(res.body.config.routePlSql[0].hasAuth).toBe(true);
			expect(res.body.config.routePlSql[0].hasTransactionMode).toBe(true);
			expect(res.body.config.routePlSql[0].hasCgi).toBe(true);
		});

		it('should return paused status when paused', async () => {
			adminContext.setPaused(true);
			const res = await request(app).get('/admin/api/status');
			expect(res.body.status).toBe('paused');
		});
	});

	describe('GET /api/logs/access', () => {
		it('should return message when access logging is disabled', async () => {
			if (adminContext.config) {
				adminContext.config.loggerFilename = '';
			}
			const res = await request(app).get('/admin/api/logs/access');
			expect(res.body.message).toBe('Access logging not enabled');
		});

		it('should return logs when enabled', async () => {
			vi.spyOn(fs, 'existsSync').mockReturnValue(true);

			const res = await request(app).get('/admin/api/logs/access');
			expect(res.status).toBe(200);
			expect(res.body).toEqual(['line 2', 'line 1']);
		});

		it('should filter logs when filter is provided', async () => {
			vi.spyOn(fs, 'existsSync').mockReturnValue(true);
			const readline = await import('node:readline');
			// @ts-expect-error - mock createInterface implementation for testing
			readline.default.createInterface.mockReturnValueOnce({
				[Symbol.asyncIterator]: async function* () {
					await Promise.resolve();
					yield 'GET /index.html 200';
					yield 'POST /api/login 401';
					yield 'GET /favicon.ico 200';
				},
			});

			const res = await request(app).get('/admin/api/logs/access?filter=login');
			expect(res.status).toBe(200);
			expect(res.body).toEqual(['POST /api/login 401']);
		});

		it('should limit logs when limit is provided', async () => {
			vi.spyOn(fs, 'existsSync').mockReturnValue(true);
			const readline = await import('node:readline');
			// @ts-expect-error - mock createInterface implementation for testing
			readline.default.createInterface.mockReturnValueOnce({
				[Symbol.asyncIterator]: async function* () {
					await Promise.resolve();
					yield 'line 1';
					yield 'line 2';
					yield 'line 3';
				},
			});

			const res = await request(app).get('/admin/api/logs/access?limit=2');
			expect(res.status).toBe(200);
			expect(res.body).toEqual(['line 3', 'line 2']);
		});

		it('should return 500 on error', async () => {
			vi.spyOn(fs, 'existsSync').mockImplementation(() => {
				throw new Error('fs error');
			});

			const res = await request(app).get('/admin/api/logs/access');
			expect(res.status).toBe(500);
			expect(res.body.error).toBe('Error: fs error');
		});
	});

	describe('GET /api/logs/error', () => {
		it('should return parsed error logs', async () => {
			vi.spyOn(fs, 'existsSync').mockReturnValue(true);

			// Mock readline to return valid and invalid JSON lines
			const readline = await import('node:readline');
			// @ts-expect-error - mock createInterface implementation for testing
			readline.default.createInterface.mockReturnValueOnce({
				[Symbol.asyncIterator]: async function* () {
					await Promise.resolve();
					yield '{"timestamp":"2026-02-12T00:00:00.000Z","type":"error","message":"valid"}';
					yield 'invalid json';
				},
			});

			const res = await request(app).get('/admin/api/logs/error');
			expect(res.status).toBe(200);
			expect(res.body).toHaveLength(1);
			expect(res.body[0].message).toBe('valid');
		});

		it('should return 500 on error', async () => {
			vi.spyOn(fs, 'existsSync').mockImplementation(() => {
				throw new Error('fs error');
			});

			const res = await request(app).get('/admin/api/logs/error');
			expect(res.status).toBe(500);
			expect(res.body.error).toBe('Error: fs error');
		});
	});

	describe('POST /api/cache/clear', () => {
		it('should clear all caches', async () => {
			const clearProc = vi.fn();
			const clearArg = vi.fn();
			// @ts-expect-error - overriding readonly caches for testing
			adminContext.caches = [
				{
					poolName: '/pls',
					procedureNameCache: {clear: clearProc} as unknown as Cache<any>,
					argumentCache: {clear: clearArg} as unknown as Cache<any>,
				},
			];

			const res = await request(app).post('/admin/api/cache/clear').send({});
			expect(res.status).toBe(200);
			expect(clearProc).toHaveBeenCalled();
			expect(clearArg).toHaveBeenCalled();
		});
	});

	describe('POST /api/server/:action', () => {
		it('should pause the server', async () => {
			const res = await request(app).post('/admin/api/server/pause');
			expect(res.status).toBe(200);
			expect(adminContext.paused).toBe(true);
		});

		it('should resume the server', async () => {
			adminContext.setPaused(true);
			const res = await request(app).post('/admin/api/server/resume');
			expect(res.status).toBe(200);
			expect(adminContext.paused).toBe(false);
		});

		it('should trigger shutdown on stop', async () => {
			vi.useFakeTimers();
			try {
				const res = await request(app).post('/admin/api/server/stop');
				expect(res.status).toBe(200);
				vi.runAllTimers();
				expect(shutdownUtils.forceShutdown).toHaveBeenCalled();
			} finally {
				vi.useRealTimers();
			}
		});

		it('should return 400 for invalid action', async () => {
			const res = await request(app).post('/admin/api/server/invalid');
			expect(res.status).toBe(400);
		});
	});

	describe('Trace API', () => {
		it('GET /api/trace/status should return trace status', async () => {
			const res = await request(app).get('/admin/api/trace/status');
			expect(res.status).toBe(200);
			expect(res.body).toHaveProperty('enabled');
		});

		it('POST /api/trace/toggle should toggle tracing', async () => {
			const res = await request(app).post('/admin/api/trace/toggle').send({enabled: true});
			expect(res.status).toBe(200);
			expect(res.body.enabled).toBe(true);

			const resOff = await request(app).post('/admin/api/trace/toggle').send({enabled: false});
			expect(resOff.body.enabled).toBe(false);
		});

		it('GET /api/trace/logs should return trace logs', async () => {
			vi.spyOn(fs, 'existsSync').mockReturnValue(true);
			const readline = await import('node:readline');
			// @ts-expect-error - mock createInterface implementation for testing purposes in Vitest
			readline.default.createInterface.mockReturnValueOnce({
				[Symbol.asyncIterator]: async function* () {
					await Promise.resolve();
					yield JSON.stringify({
						id: '1',
						timestamp: new Date().toISOString(),
						source: 'test',
						url: '/test',
						method: 'GET',
						status: '200',
						duration: 10,
					});
				},
			});

			const res = await request(app).get('/admin/api/trace/logs');
			expect(res.status).toBe(200);
			expect(res.body).toHaveLength(1);
			expect(res.body[0].id).toBe('1');
		});

		it('POST /api/trace/clear should clear traces', async () => {
			const res = await request(app).post('/admin/api/trace/clear');
			expect(res.status).toBe(200);
			expect(res.body.message).toBe('Traces cleared');
		});
	});

	describe('Corner cases for coverage', () => {
		it('GET /api/status should handle null config and pool statistics', async () => {
			// @ts-expect-error - testing null config
			adminContext.config = null;
			// @ts-expect-error - overriding readonly pools for testing
			adminContext.pools = [{connectionsOpen: 1, connectionsInUse: 0, getStatistics: () => ({stats: 'ok'})} as any];
			// @ts-expect-error - overriding readonly caches for testing
			adminContext.caches = []; // cache undefined for index 0

			const res = await request(app).get('/admin/api/status');
			expect(res.status).toBe(200);
			expect(res.body.config).toBeUndefined();
			expect(res.body.pools[0].name).toBe('pool-0');
			expect(res.body.pools[0].stats).toEqual({stats: 'ok'});
		});

		it('GET /api/stats/history should handle various limit scenarios', async () => {
			// limit not a string (undefined) -> already covered by default
			// limit as invalid string
			const resInvalid = await request(app).get('/admin/api/stats/history?limit=abc');
			expect(resInvalid.status).toBe(200);

			// limit <= 0
			const resZero = await request(app).get('/admin/api/stats/history?limit=0');
			expect(resZero.status).toBe(200);
		});

		it('readLastLines should return early if file does not exist', async () => {
			vi.spyOn(fs, 'existsSync').mockReturnValue(false);
			const res = await request(app).get('/admin/api/logs/error');
			expect(res.status).toBe(200);
			expect(res.body).toEqual([]);
		});
	});
});
