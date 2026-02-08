import {describe, it, assert, beforeEach, afterEach, vi} from 'vitest';
import {StatsManager} from '../src/util/statsManager.js';

/**
 * @typedef {import('../src/util/statsManager.js').StatsSummary} StatsSummary
 * @typedef {import('../src/util/statsManager.js').Bucket} Bucket
 * @typedef {import('../src/util/statsManager.js').PoolSnapshot} PoolSnapshot
 */

describe('StatsManager', () => {
	/** @type {StatsManager} */
	let manager;

	beforeEach(() => {
		vi.useFakeTimers();
		manager = new StatsManager({
			intervalMs: 1000,
			maxHistoryPoints: 5,
			sampleSystem: false,
		});
	});

	afterEach(() => {
		manager.stop();
		vi.restoreAllMocks();
	});

	it('should initialize with empty state', () => {
		const summary = manager.getSummary();
		assert.strictEqual(summary.totalRequests, 0);
		assert.strictEqual(summary.totalErrors, 0);
		assert.strictEqual(summary.minResponseTime, -1);
		assert.strictEqual(manager.getHistory().length, 0);
	});

	it('should record requests and update lifetime stats', () => {
		manager.recordRequest(100, false);
		manager.recordRequest(200, true);
		manager.recordRequest(50, false);

		const summary = manager.getSummary();
		assert.strictEqual(summary.totalRequests, 3);
		assert.strictEqual(summary.totalErrors, 1);
		assert.strictEqual(summary.minResponseTime, 50);
		assert.strictEqual(summary.maxResponseTime, 200);
		assert.strictEqual(summary.avgResponseTime, (100 + 200 + 50) / 3);
	});

	it('should rotate buckets and store history', () => {
		manager.recordRequest(10, false);
		manager.rotateBucket(); // Bucket 1

		manager.recordRequest(20, false);
		manager.recordRequest(30, false);
		manager.rotateBucket(); // Bucket 2

		const history = manager.getHistory();
		assert.strictEqual(history.length, 2);
		const b0 = history[0];
		const b1 = history[1];
		if (!b0 || !b1) {
			assert.fail('Buckets should exist');
		} else {
			assert.strictEqual(b0.requests, 1);
			assert.strictEqual(b1.requests, 2);
			assert.strictEqual(b0.durationAvg, 10);
			assert.strictEqual(b1.durationAvg, 25);
		}
	});

	it('should respect maxHistoryPoints (ring buffer)', () => {
		for (let i = 0; i < 10; i++) {
			manager.recordRequest(i, false);
			manager.rotateBucket();
		}

		const history = manager.getHistory();
		assert.strictEqual(history.length, 5); // maxHistoryPoints is 5
		const b4 = history[4];
		if (!b4) {
			assert.fail('Latest bucket should exist');
		} else {
			assert.strictEqual(b4.requests, 1);
			assert.strictEqual(b4.durationAvg, 9); // Latest value
		}
	});

	it('should calculate P95 and P99 percentiles correctly', () => {
		// Push 100 samples: 1, 2, 3... 100
		for (let i = 1; i <= 100; i++) {
			manager.recordRequest(i, false);
		}
		manager.rotateBucket();

		const history = manager.getHistory();
		const latest = history[0];
		if (!latest) {
			assert.fail('Latest bucket should exist');
		} else {
			assert.strictEqual(latest.durationP95, 96);
			assert.strictEqual(latest.durationP99, 100);
		}
	});

	it('should calculate P95 and P99 for small datasets', () => {
		manager.recordRequest(10, false);
		manager.recordRequest(100, false);
		manager.rotateBucket();

		const history = manager.getHistory();
		const latest = history[0];
		if (!latest) {
			assert.fail('Latest bucket should exist');
		} else {
			assert.strictEqual(latest.durationP95, 100);
			assert.strictEqual(latest.durationP99, 100);
		}
	});

	it('should track lifetime extremes for memory and CPU', () => {
		// Manual rotation triggers sampling
		manager.rotateBucket();
		const summary = manager.getSummary();

		assert.ok(summary.maxMemory.heapUsedMax > 0);
		assert.ok(summary.cpu.max >= 0);
	});

	it('should include pool snapshots in buckets', () => {
		/** @type {PoolSnapshot[]} */
		const pools = [
			{
				name: 'test',
				connectionsOpen: 10,
				connectionsInUse: 2,
				cache: {
					procedureName: {size: 1, hits: 1, misses: 1},
					argument: {size: 1, hits: 1, misses: 1},
				},
			},
		];
		manager.recordRequest(10, false);
		manager.rotateBucket(pools);

		const history = manager.getHistory();
		const latest = history[0];
		if (!latest) {
			assert.fail('Latest bucket should exist');
		} else {
			assert.strictEqual(latest.pools.length, 1);
			const p0 = latest.pools[0];
			if (p0) {
				assert.strictEqual(p0.name, 'test');
				assert.strictEqual(p0.connectionsInUse, 2);
				assert.ok(p0.cache);
				if (p0.cache) {
					assert.strictEqual(p0.cache.procedureName.hits, 1);
				}
			}
		}
	});
});
