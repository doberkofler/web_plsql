import assert from 'node:assert';
import {describe, it} from 'node:test';
import {isStringOrArrayOfString} from '../src/util/type.js';

describe('type', () => {
	it('isStringOrArrayOfString', () => {
		assert.strictEqual(isStringOrArrayOfString(0), false);
		assert.strictEqual(isStringOrArrayOfString(''), true);
		assert.strictEqual(isStringOrArrayOfString(['']), true);
	});
});
