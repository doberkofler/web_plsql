import assert from 'node:assert';
import {describe, it} from 'vitest';
import {errorToString} from '../../../src/util/errorToString.js';

describe('errorToString', () => {
	it('should return the string if input is a string', () => {
		const result = errorToString('some error');
		assert.strictEqual(result, 'some error');
	});

	it('should format an Error object correctly', () => {
		const error = new Error('test message');
		// We can't easily force stack to be a specific string cross-platform without mocking,
		// but we can check if the output contains the message and name.
		const result = errorToString(error);
		assert.ok(result.includes('Error'));
		assert.ok(result.includes('test message'));
	});

	it('should format an Error object with stack correctly', () => {
		const error = new Error('test message');
		error.stack = 'Error: test message\n    at somewhere';
		const result = errorToString(error);
		assert.ok(result.includes('Error'));
		assert.ok(result.includes('test message'));
		assert.ok(result.includes('at somewhere'));
	});

	it('should format an Error object without message correctly', () => {
		const error = new Error();
		error.message = ''; // unexpected but possible
		const result = errorToString(error);
		assert.ok(result.includes('Error'));
	});

	it('should format a non-Error object using inspect', () => {
		const obj = {foo: 'bar'};
		const result = errorToString(obj);
		assert.ok(result.includes("{ foo: 'bar' }"));
	});
});
