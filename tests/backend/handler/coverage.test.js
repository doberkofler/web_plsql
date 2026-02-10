import {describe, it, expect, vi, beforeEach} from 'vitest';
import express from 'express';
import request from 'supertest';
import {AdminContext} from '../../../src/server/adminContext.js';
import {handlerAdmin} from '../../../src/handler/handlerAdmin.js';
import {StatsManager} from '../../../src/util/statsManager.js';
import fs from 'node:fs';

vi.mock('../../../src/util/shutdown.js');

vi.mock('node:readline', () => ({
	default: {
		createInterface: vi.fn(() => ({
			[Symbol.asyncIterator]: async function* () {
				await Promise.resolve(null);
				yield 'line 1';
			},
		})),
	},
}));

describe('handler/handlerAdmin coverage', () => {
	/** @type {import('express').Express} */
	let app;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(fs, 'existsSync').mockReturnValue(false);
		vi.spyOn(fs, 'createReadStream').mockReturnValue(/** @type {any} */ ({}));

		app = express();
		app.use(express.json());
		app.use('/admin', handlerAdmin);

		AdminContext.statsManager = new StatsManager({
			intervalMs: 1000,
			maxHistoryPoints: 5,
			sampleSystem: false,
		});
		AdminContext.pools = [];
		AdminContext.caches = [];
	});

	describe('readLastLines coverage', () => {
		it('should return empty array if file does not exist', async () => {
			vi.spyOn(fs, 'existsSync').mockReturnValue(false);
			const res = await request(app).get('/admin/api/logs/error');
			expect(res.status).toBe(200);
			expect(res.body).toEqual([]);
		});
	});

	describe('GET /api/stats/history', () => {
		it('should return history with default limit', async () => {
			AdminContext.statsManager.recordRequest(100, false);
			const res = await request(app).get('/admin/api/stats/history');
			expect(res.status).toBe(200);
			expect(Array.isArray(res.body)).toBe(true);
		});

		it('should return history with specified limit', async () => {
			AdminContext.statsManager.recordRequest(100, false);
			AdminContext.statsManager.rotateBucket();
			AdminContext.statsManager.recordRequest(200, false);
			AdminContext.statsManager.rotateBucket();
			const res = await request(app).get('/admin/api/stats/history?limit=1');
			expect(res.status).toBe(200);
			expect(res.body.length).toBe(1);
		});

		it('should handle invalid limit gracefully', async () => {
			AdminContext.statsManager.recordRequest(100, false);
			const res = await request(app).get('/admin/api/stats/history?limit=invalid');
			expect(res.status).toBe(200);
			expect(Array.isArray(res.body)).toBe(true);
		});
	});

	describe('GET /api/trace/logs', () => {
		it('should handle errors gracefully', async () => {
			vi.spyOn(fs, 'existsSync').mockImplementation(() => {
				throw new Error('fs error');
			});
			const res = await request(app).get('/admin/api/trace/logs');
			expect(res.status).toBe(500);
			expect(res.body.error).toBe('Error: fs error');
		});
	});
});
