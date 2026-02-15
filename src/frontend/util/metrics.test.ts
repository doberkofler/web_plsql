import {describe, it, expect} from 'vitest';
import {updateMinMaxMetrics} from '../util/metrics.ts';
import type {SystemMetrics} from '../types.ts';

describe('Admin Metrics Utils', () => {
	describe('updateMinMaxMetrics', () => {
		it('should initialize min/max if undefined', () => {
			const current: SystemMetrics = {
				heapUsed: 100,
				heapTotal: 200,
				rss: 300,
				external: 400,
				cpuUser: 1.5,
				cpuSystem: 0.5,
			};
			const min: Partial<SystemMetrics> = {};
			const max: Partial<SystemMetrics> = {};

			updateMinMaxMetrics(current, min, max);

			expect(min).toEqual(current);
			expect(max).toEqual(current);
		});

		it('should update min if current is lower', () => {
			const current: SystemMetrics = {
				heapUsed: 50,
				heapTotal: 200,
				rss: 300,
				external: 400,
				cpuUser: 1,
				cpuSystem: 0.5,
			};
			const min: Partial<SystemMetrics> = {
				heapUsed: 100,
				heapTotal: 200,
				rss: 300,
				external: 400,
				cpuUser: 1.5,
				cpuSystem: 0.5,
			};
			const max: Partial<SystemMetrics> = {...min};

			updateMinMaxMetrics(current, min, max);

			expect(min.heapUsed).toBe(50);
			expect(min.cpuUser).toBe(1);
			expect(max.heapUsed).toBe(100); // Should stay same
			expect(max.cpuUser).toBe(1.5); // Should stay same
		});

		it('should update max if current is higher', () => {
			const current: SystemMetrics = {
				heapUsed: 150,
				heapTotal: 200,
				rss: 300,
				external: 400,
				cpuUser: 2,
				cpuSystem: 0.5,
			};
			const min: Partial<SystemMetrics> = {
				heapUsed: 100,
				heapTotal: 200,
				rss: 300,
				external: 400,
				cpuUser: 1.5,
				cpuSystem: 0.5,
			};
			const max: Partial<SystemMetrics> = {...min};

			updateMinMaxMetrics(current, min, max);

			expect(max.heapUsed).toBe(150);
			expect(max.cpuUser).toBe(2);
			expect(min.heapUsed).toBe(100); // Should stay same
			expect(min.cpuUser).toBe(1.5); // Should stay same
		});

		it('should handle mixed updates', () => {
			const current: SystemMetrics = {
				heapUsed: 50, // Lower
				heapTotal: 300, // Higher
				rss: 300, // Same
				external: 400, // Same
				cpuUser: 0.5, // Lower
				cpuSystem: 1, // Higher
			};
			const min: Partial<SystemMetrics> = {
				heapUsed: 100,
				heapTotal: 200,
				rss: 300,
				external: 400,
				cpuUser: 1.5,
				cpuSystem: 0.5,
			};
			const max: Partial<SystemMetrics> = {
				heapUsed: 100,
				heapTotal: 200,
				rss: 300,
				external: 400,
				cpuUser: 1.5,
				cpuSystem: 0.5,
			};

			updateMinMaxMetrics(current, min, max);

			expect(min.heapUsed).toBe(50);
			expect(max.heapUsed).toBe(100);

			expect(min.heapTotal).toBe(200);
			expect(max.heapTotal).toBe(300);

			expect(min.cpuUser).toBe(0.5);
			expect(max.cpuUser).toBe(1.5);

			expect(min.cpuSystem).toBe(0.5);
			expect(max.cpuSystem).toBe(1);
		});
	});
});
