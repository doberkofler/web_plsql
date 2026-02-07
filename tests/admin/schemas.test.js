import {describe, it, expect} from 'vitest';
import {
	cacheStatsSchema,
	cacheInfoSchema,
	cacheDataSchema,
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
			const valid = {hits: 10, misses: 5};
			expect(cacheStatsSchema.parse(valid)).toEqual(valid);
		});

		it('should fail on invalid types', () => {
			const invalid = {hits: '10', misses: 5};
			expect(() => cacheStatsSchema.parse(invalid)).toThrow();
		});
	});

	describe('metricsSchema', () => {
		it('should validate correct metrics', () => {
			const valid = {requestCount: 100, errorCount: 2, avgResponseTime: 1.5};
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
				metrics: {requestCount: 100, errorCount: 5, avgResponseTime: 2.3},
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
				metrics: {requestCount: 0, errorCount: 0, avgResponseTime: 0},
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
				metrics: {requestCount: 0, errorCount: 0, avgResponseTime: 0},
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

	describe('cacheInfoSchema', () => {
		it('should validate cache info', () => {
			const valid = {
				size: 10,
				stats: {hits: 100, misses: 20},
			};
			expect(cacheInfoSchema.parse(valid)).toEqual(valid);
		});

		it('should fail on missing stats', () => {
			const invalid = {size: 10};
			expect(() => cacheInfoSchema.parse(invalid)).toThrow();
		});
	});

	describe('cacheDataSchema', () => {
		it('should validate cache data', () => {
			const valid = {
				poolName: 'test-pool',
				procedureNameCache: {size: 5, stats: {hits: 50, misses: 10}},
				argumentCache: {size: 3, stats: {hits: 30, misses: 5}},
			};
			expect(cacheDataSchema.parse(valid)).toEqual(valid);
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
