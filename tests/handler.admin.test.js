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
		// Spy on fs methods instead of global mock
		vi.spyOn(fs, 'existsSync').mockReturnValue(false);
		vi.spyOn(fs, 'createReadStream').mockReturnValue(/** @type {any} */ ({}));

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
		AdminContext.statsManager.recordRequest(100, false);
		AdminContext.statsManager.recordRequest(200, true);
	});

	describe('GET /api/status', () => {
		it('should return server status', async () => {
			const res = await request(app).get('/admin/api/status');
			expect(res.status).toBe(200);
			expect(res.body.version).toBeDefined();
			expect(res.body.status).toBe('running');
			expect(res.body.metrics.requestCount).toBe(2);
			expect(res.body.config.routePlSql[0].password).toBe('********');
			// Verify cache stats are present
			expect(res.body.pools).toBeDefined();
			if (res.body.pools.length > 0) {
				expect(res.body.pools[0].cache).toBeDefined();
				expect(res.body.pools[0].cache.procedureName).toBeDefined();
			}
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
			vi.spyOn(fs, 'existsSync').mockReturnValue(true);

			const res = await request(app).get('/admin/api/logs/access');
			expect(res.status).toBe(200);
			expect(res.body).toEqual(['line 2', 'line 1']);
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
					yield '{"type":"error","message":"valid"}';
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

	// REMOVED GET /api/cache tests

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
});
