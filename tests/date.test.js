import assert from 'node:assert';
import {describe, it} from 'node:test';
import {humanDuration} from '../src/date.js';

describe('date', () => {
	it('humanDuration', () => {
		assert.strictEqual(humanDuration(0), '0ms');
		assert.strictEqual(humanDuration(1), '1ms');
		assert.strictEqual(humanDuration(1000), '1s');
		assert.strictEqual(humanDuration(60 * 1000), '1m');
		assert.strictEqual(humanDuration(60 * 60 * 1000), '1h');
		assert.strictEqual(humanDuration(24 * 60 * 60 * 1000), '1d');
		assert.strictEqual(humanDuration(24 * 60 * 60 * 1000 + 60 * 60 * 1000 + 60 * 1000 + 1000), '1d 1h 1m 1s');
	});
});
