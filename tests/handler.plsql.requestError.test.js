import assert from 'node:assert';
import {describe, it} from 'vitest';
import {RequestError} from '../src/handler/plsql/requestError.js';

describe('RequestError', () => {
	it('should create a RequestError with a message', () => {
		const message = 'Something went wrong';
		const error = new RequestError(message);

		assert.ok(error instanceof RequestError);
		assert.ok(error instanceof Error);
		assert.strictEqual(error.message, message);
		assert.ok(error.timestamp instanceof Date);
		assert.ok(error.stack);
	});
});
