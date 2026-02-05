import assert from 'node:assert';
import {describe, it, vi} from 'vitest';
import {sanitizeProcName} from '../src/handler/plsql/procedureSanitize.js';
import {RequestError} from '../src/handler/plsql/requestError.js';

describe('handler/plsql/procedureSanitize', () => {
	const mockConnection = {};
	/** @type {any} */
	const defaultOptions = {
		exclusionList: [],
		requestValidationFunction: '',
	};

	it('should return sanitized procedure name', async () => {
		/** @type {any} */
		const conn = mockConnection;
		const result = await sanitizeProcName('MyProc', conn, defaultOptions);
		assert.strictEqual(result, 'myproc');
	});

	it('should remove special characters', async () => {
		/** @type {any} */
		const conn = mockConnection;
		const result = await sanitizeProcName('My-Proc!', conn, defaultOptions);
		assert.strictEqual(result, 'myproc');
	});

	it('should throw error if procedure is in default exclusion list', async () => {
		const procName = 'sys.evil';
		/** @type {any} */
		const conn = mockConnection;
		await assert.rejects(
			async () => {
				await sanitizeProcName(procName, conn, defaultOptions);
			},
			(err) => {
				assert.ok(err instanceof RequestError);
				assert.ok(err.message.includes('default exclusion list'));
				return true;
			},
		);
	});

	it('should throw error if procedure is in custom exclusion list', async () => {
		/** @type {any} */
		const options = {...defaultOptions, exclusionList: ['custom.']};
		const procName = 'custom.evil';
		/** @type {any} */
		const conn = mockConnection;
		await assert.rejects(
			async () => {
				await sanitizeProcName(procName, conn, options);
			},
			(err) => {
				assert.ok(err instanceof RequestError);
				assert.ok(err.message.includes('custom exclusion list'));
				return true;
			},
		);
	});

	it('should call request validation function if provided', async () => {
		const mockExecute = vi.fn().mockResolvedValue({
			outBinds: {valid: 1},
		});
		/** @type {any} */
		const connection = {execute: mockExecute};
		/** @type {any} */
		const options = {...defaultOptions, requestValidationFunction: 'check_valid'};

		const result = await sanitizeProcName('myproc', connection, options);
		assert.strictEqual(result, 'myproc');
		assert.strictEqual(mockExecute.mock.calls.length, 1);
	});

	it('should throw error if request validation function returns invalid', async () => {
		const mockExecute = vi.fn().mockResolvedValue({
			outBinds: {valid: 0},
		});
		/** @type {any} */
		const connection = {execute: mockExecute};
		/** @type {any} */
		const options = {...defaultOptions, requestValidationFunction: 'check_valid'};

		await assert.rejects(
			async () => {
				await sanitizeProcName('myproc_invalid', connection, options);
			},
			(err) => {
				assert.ok(err instanceof RequestError);
				assert.ok(err.message.includes('not valid according to the request validation function'));
				return true;
			},
		);
	});
});
