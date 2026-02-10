import {describe, it, assert} from 'vitest';
import {Cache} from '../../../src/util/cache.js';

describe('Cache', () => {
	it('should store and retrieve values', () => {
		const cache = new Cache();
		cache.set('key1', 'value1');
		assert.strictEqual(cache.get('key1'), 'value1');
		assert.strictEqual(cache.get('key2'), undefined);
	});

	it('should delete values', () => {
		const cache = new Cache();
		cache.set('key1', 'value1');
		cache.delete('key1');
		assert.strictEqual(cache.get('key1'), undefined);
	});

	it('should clear cache', () => {
		const cache = new Cache();
		cache.set('key1', 'value1');
		cache.set('key2', 'value2');
		cache.clear();
		assert.strictEqual(cache.size, 0);
	});

	it('should enforce maxSize using LFU policy', () => {
		// Create a small cache of size 5
		const cache = new Cache(5);

		// Fill the cache
		cache.set('A', 1);
		cache.set('B', 2);
		cache.set('C', 3);
		cache.set('D', 4);
		cache.set('E', 5);

		// Access some items to increase hitCount
		// A: 2 hits
		cache.get('A');
		cache.get('A');
		// B: 1 hit
		cache.get('B');
		// C: 0 hits (default)
		// D: 0 hits
		// E: 0 hits

		// Add one more item to trigger prune
		// Prune removes 10% of 5 = 0.5 -> max(1, 0) = 1 item.
		// The sort is stable or depends on JS engine, but A and B should definitely stay.
		// C, D, E are candidates for removal.
		cache.set('F', 6);

		// Size should be <= 5 (it prunes then adds, so it might be 5)
		// Logic: if size >= max && !has(key) -> prune.
		// 5 >= 5 -> prune (removes 1) -> size 4 -> add -> size 5.
		assert.strictEqual(cache.size, 5);

		// A and B should exist because they were used
		assert.strictEqual(cache.get('A'), 1);
		assert.strictEqual(cache.get('B'), 2);
		assert.strictEqual(cache.get('F'), 6);
	});

	it('should remove multiple items when pruning large cache', () => {
		const cache = new Cache(20);
		// Fill 20 items
		for (let i = 0; i < 20; i++) {
			cache.set(`k${i}`, i);
		}

		// Use the second half
		for (let i = 10; i < 20; i++) {
			cache.get(`k${i}`);
		}

		// Trigger prune
		cache.set('new', 999);

		// 10% of 20 is 2. So 2 items should be removed.
		// The first 10 items (0-9) have 0 hits.
		// 2 of those should be gone.
		// Size should be 20 - 2 + 1 = 19.
		assert.strictEqual(cache.size, 19);
		assert.strictEqual(cache.get('new'), 999);
	});

	it('should return keys and stats', () => {
		const cache = new Cache(100);
		cache.set('k1', 'v1');
		cache.get('k1'); // hit
		cache.get('k2'); // miss

		assert.deepStrictEqual(cache.keys(), ['k1']);
		const stats = cache.getStats();
		assert.strictEqual(stats.size, 1);
		assert.strictEqual(stats.maxSize, 100);
		assert.strictEqual(stats.hits, 1);
		assert.strictEqual(stats.misses, 1);
	});
});
