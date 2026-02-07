import {describe, it, expect, vi, beforeEach} from 'vitest';
import express from 'express';
import request from 'supertest';
import {AdminContext} from '../src/server/server.js';
import {handlerAdmin} from '../src/handler/handlerAdmin.js';
import * as shutdownUtils from '../src/util/shutdown.js';
import fs from 'node:fs';

/**
 * @typedef {import('vitest').Mock} Mock
 * @typedef {import('../src/util/cache.js').Cache<any>} GenericCache
 */

vi.mock('../src/util/shutdown.js');
vi.mock('node:fs', () => ({
	default: {
		existsSync: vi.fn(),
		createReadStream: vi.fn(),
	},
	existsSync: vi.fn(),
	createReadStream: vi.fn(),
}));

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
	/** @type {import('express').Express} */
	let app;

	beforeEach(() => {
		vi.clearAllMocks();
		app = express();
		app.use(express.json());
		app.use('/admin', handlerAdmin);

		// Reset AdminContext
		AdminContext.startTime = new Date(Date.now() - 10000); // 10s ago
		AdminContext.config = {
			port: 8080,
			adminRoute: '/admin',
			loggerFilename: 'access.log',
			routeStatic: [],
			routePlSql: [
				{route: '/pls', user: 'scott', password: 'tiger', connectString: 'xe', documentTable: 'docs', defaultPage: 'home', errorStyle: 'basic'},
			],
		};
		AdminContext.pools = [];
		AdminContext.caches = [];
		AdminContext.paused = false;
		AdminContext.metrics = {requestCount: 5, errorCount: 1};
	});

	describe('GET /api/status', () => {
		it('should return server status', async () => {
			const res = await request(app).get('/admin/api/status');
			expect(res.status).toBe(200);
			expect(res.body.version).toBeDefined();
			expect(res.body.status).toBe('running');
			expect(res.body.metrics.requestCount).toBe(5);
			expect(res.body.config.routePlSql[0].password).toBe('********');
		});

		it('should return paused status when paused', async () => {
			AdminContext.paused = true;
			const res = await request(app).get('/admin/api/status');
			expect(res.body.status).toBe('paused');
		});
	});

	describe('GET /api/logs/access', () => {
		it('should return message when access logging is disabled', async () => {
			if (AdminContext.config) {
				AdminContext.config.loggerFilename = '';
			}
			const res = await request(app).get('/admin/api/logs/access');
			expect(res.body.message).toBe('Access logging not enabled');
		});

		it('should return logs when enabled', async () => {
			const fsMock = /** @type {{existsSync: Mock}} */ (/** @type {unknown} */ (fs));
			fsMock.existsSync.mockReturnValue(true);

			const res = await request(app).get('/admin/api/logs/access');
			expect(res.status).toBe(200);
			expect(res.body).toEqual(['line 2', 'line 1']);
		});
	});

	describe('GET /api/cache', () => {
		it('should return cache statistics', async () => {
			AdminContext.caches = [
				{
					poolName: '/pls',
					procedureNameCache: /** @type {GenericCache} */ (
						/** @type {unknown} */ ({
							keys: () => ['a', 'b'],
							getStats: () => ({size: 2, maxSize: 100, hits: 10, misses: 2}),
						})
					),
					argumentCache: /** @type {GenericCache} */ (
						/** @type {unknown} */ ({
							keys: () => ['c'],
							getStats: () => ({size: 1, maxSize: 100, hits: 5, misses: 0}),
						})
					),
				},
			];

			const res = await request(app).get('/admin/api/cache');
			expect(res.status).toBe(200);
			expect(res.body[0].poolName).toBe('/pls');
			expect(res.body[0].procedureNameCache.size).toBe(2);
		});
	});

	describe('POST /api/cache/clear', () => {
		it('should clear all caches', async () => {
			const clearProc = vi.fn();
			const clearArg = vi.fn();
			AdminContext.caches = [
				{
					poolName: '/pls',
					procedureNameCache: /** @type {GenericCache} */ (/** @type {unknown} */ ({clear: clearProc})),
					argumentCache: /** @type {GenericCache} */ (/** @type {unknown} */ ({clear: clearArg})),
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
			expect(AdminContext.paused).toBe(true);
		});

		it('should resume the server', async () => {
			AdminContext.paused = true;
			const res = await request(app).post('/admin/api/server/resume');
			expect(res.status).toBe(200);
			expect(AdminContext.paused).toBe(false);
		});

		it('should trigger shutdown on stop', async () => {
			vi.useFakeTimers();
			const res = await request(app).post('/admin/api/server/stop');
			expect(res.status).toBe(200);
			vi.runAllTimers();
			expect(shutdownUtils.forceShutdown).toHaveBeenCalled();
			vi.useRealTimers();
		});

		it('should return 400 for invalid action', async () => {
			const res = await request(app).post('/admin/api/server/invalid');
			expect(res.status).toBe(400);
		});
	});
});
