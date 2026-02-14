import {assert, describe, it} from 'vitest';
import {getVersion} from './version.ts';

describe('version', () => {
	it('must match package', () => {
		assert.strictEqual(getVersion(), 'test');
	});
});
