import {describe, it, expect} from 'vitest';
import {
	cacheStatsSchema,
	poolCacheSnapshotSchema,
	poolStatsSchema,
	poolInfoSchema,
	metricsSchema,
	statusSchema,
	errorLogSchema,
	accessLogResponseSchema,
} from '../../src/admin/js/schemas.js';

describe('Admin Zod Schemas', () => {
	describe('cacheStatsSchema', () => {
		it('should validate correct cache stats', () => {
			const valid = {size: 100, hits: 10, misses: 5};
			expect(cacheStatsSchema.parse(valid)).toEqual(valid);
		});

		it('should fail on invalid types', () => {
			const invalid = {size: '100', hits: '10', misses: 5};
			expect(() => cacheStatsSchema.parse(invalid)).toThrow();
		});
	});

	describe('metricsSchema', () => {
		it('should validate correct metrics', () => {
			const valid = {requestCount: 100, errorCount: 2, avgResponseTime: 1.5, minResponseTime: 0.1, maxResponseTime: 10.0};
			expect(metricsSchema.parse(valid)).toEqual(valid);
		});
	});

	describe('statusSchema', () => {
		it('should validate full status response', () => {
			const valid = {
				version: '0.20.0',
				status: 'running',
				uptime: 3600,
				startTime: new Date().toISOString(),
				metrics: {requestCount: 100, errorCount: 5, avgResponseTime: 2.3, minResponseTime: 0.1, maxResponseTime: 10.0},
				pools: [
					{
						name: 'pool1',
						connectionsInUse: 2,
						connectionsOpen: 5,
						stats: {totalRequests: 500, totalTimeouts: 0},
					},
				],
				system: {
					nodeVersion: 'v22.0.0',
					platform: 'darwin',
					arch: 'x64',
					memory: {
						rss: 100000000,
						heapTotal: 50000000,
						heapUsed: 30000000,
						external: 5000000,
					},
					cpu: {
						user: 1000000,
						system: 500000,
					},
				},
				config: {
					port: 8080,
					adminRoute: '/admin',
				},
			};
			expect(statusSchema.parse(valid)).toEqual(valid);
		});

		it('should allow partial config', () => {
			const valid = {
				version: '0.20.0',
				status: 'paused',
				uptime: 100,
				startTime: new Date().toISOString(),
				metrics: {requestCount: 0, errorCount: 0, avgResponseTime: 0, minResponseTime: 0, maxResponseTime: 0},
				pools: [],
				system: {
					nodeVersion: 'v22.0.0',
					platform: 'darwin',
					arch: 'x64',
					memory: {
						rss: 100000000,
						heapTotal: 50000000,
						heapUsed: 30000000,
						external: 5000000,
					},
					cpu: {
						user: 1000000,
						system: 500000,
					},
				},
				config: {},
			};
			expect(statusSchema.parse(valid)).toEqual(valid);
		});

		it('should fail on invalid status enum', () => {
			const invalid = {
				version: '0.20.0',
				status: 'invalid_status',
				uptime: 100,
				startTime: new Date().toISOString(),
				metrics: {requestCount: 0, errorCount: 0, avgResponseTime: 0, minResponseTime: 0, maxResponseTime: 0},
				pools: [],
				system: {
					nodeVersion: 'v22.0.0',
					platform: 'darwin',
					arch: 'x64',
					memory: {
						rss: 100000000,
						heapTotal: 50000000,
						heapUsed: 30000000,
						external: 5000000,
					},
					cpu: {
						user: 1000000,
						system: 500000,
					},
				},
				config: {},
			};
			expect(() => statusSchema.parse(invalid)).toThrow();
		});
	});

	describe('accessLogResponseSchema', () => {
		it('should validate array of strings', () => {
			const valid = ['line 1', 'line 2'];
			expect(accessLogResponseSchema.parse(valid)).toEqual(valid);
		});

		it('should validate message object', () => {
			const valid = {message: 'Access logging not enabled'};
			expect(accessLogResponseSchema.parse(valid)).toEqual(valid);
		});

		it('should fail on other types', () => {
			expect(() => accessLogResponseSchema.parse(123)).toThrow();
		});
	});

	describe('poolCacheSnapshotSchema', () => {
		it('should validate pool cache snapshot', () => {
			const valid = {
				procedureName: {size: 10, hits: 100, misses: 20},
				argument: {size: 5, hits: 50, misses: 10},
			};
			expect(poolCacheSnapshotSchema.parse(valid)).toEqual(valid);
		});
	});

	describe('poolStatsSchema', () => {
		it('should validate pool stats', () => {
			const valid = {
				totalRequests: 1000,
				totalTimeouts: 5,
			};
			expect(poolStatsSchema.parse(valid)).toEqual(valid);
		});
	});

	describe('poolInfoSchema', () => {
		it('should validate pool info', () => {
			const valid = {
				name: 'main-pool',
				connectionsInUse: 2,
				connectionsOpen: 10,
				stats: {totalRequests: 500, totalTimeouts: 1},
				cache: {
					procedureName: {size: 1, hits: 0, misses: 0},
					argument: {size: 0, hits: 0, misses: 0},
				},
			};
			expect(poolInfoSchema.parse(valid)).toEqual(valid);
		});

		it('should allow null stats', () => {
			const valid = {
				name: 'main-pool',
				connectionsInUse: 0,
				connectionsOpen: 5,
				stats: null,
			};
			expect(poolInfoSchema.parse(valid)).toEqual(valid);
		});
	});

	describe('errorLogSchema', () => {
		it('should validate error log entry', () => {
			const valid = {
				timestamp: new Date().toISOString(),
				message: 'Test error',
			};
			expect(errorLogSchema.parse(valid)).toEqual(valid);
		});

		it('should allow optional fields', () => {
			const valid = {
				timestamp: new Date().toISOString(),
				message: 'Test error',
				req: {method: 'GET', url: '/test'},
				details: {fullMessage: 'Full error message here'},
			};
			expect(errorLogSchema.parse(valid)).toEqual(valid);
		});
	});
});
