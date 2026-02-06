import assert from 'node:assert';
import {describe, it, vi} from 'vitest';
import {sanitizeProcName} from '../src/handler/plsql/procedureSanitize.js';
import {RequestError} from '../src/handler/plsql/requestError.js';
import {Cache} from '../src/util/cache.js';

describe('handler/plsql/procedureSanitize', () => {
	const mockExecute = vi.fn().mockResolvedValue({
		outBinds: {resolved: 'myproc'},
	});
	/** @type {any} */
	const mockConnection = {execute: mockExecute};

	/** @type {any} */
	const defaultOptions = {
		exclusionList: [],
		requestValidationFunction: '',
	};

	it('should return sanitized procedure name', async () => {
		/** @type {any} */
		const conn = mockConnection;
		const cache = new Cache();
		const result = await sanitizeProcName('MyProc', conn, defaultOptions, cache);
		assert.strictEqual(result, 'myproc');
	});

	it('should remove special characters', async () => {
		/** @type {any} */
		const conn = mockConnection;
		const cache = new Cache();
		const result = await sanitizeProcName('My-Proc!', conn, defaultOptions, cache);
		assert.strictEqual(result, 'myproc');
	});

	it('should throw error if procedure is in default exclusion list', async () => {
		const procName = 'sys.evil';
		/** @type {any} */
		const conn = mockConnection;
		const cache = new Cache();
		await assert.rejects(
			async () => {
				await sanitizeProcName(procName, conn, defaultOptions, cache);
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
		const cache = new Cache();
		await assert.rejects(
			async () => {
				await sanitizeProcName(procName, conn, options, cache);
			},
			(err) => {
				assert.ok(err instanceof RequestError);
				assert.ok(err.message.includes('custom exclusion list'));
				return true;
			},
		);
	});

	it('should call request validation function if provided', async () => {
		// Mock needs to handle both validation check (first call) and name resolve (second call)
		const mockExecuteSeq = vi
			.fn()
			.mockResolvedValueOnce({outBinds: {valid: 1}}) // requestValidationFunction
			.mockResolvedValueOnce({outBinds: {resolved: 'myproc'}}); // resolveProcedureName

		/** @type {any} */
		const connection = {execute: mockExecuteSeq};
		/** @type {any} */
		const options = {...defaultOptions, requestValidationFunction: 'check_valid'};
		const cache = new Cache();

		const result = await sanitizeProcName('myproc', connection, options, cache);
		assert.strictEqual(result, 'myproc');
		assert.strictEqual(mockExecuteSeq.mock.calls.length, 2);
	});

	it('should throw error if request validation function returns invalid', async () => {
		const mockExecuteSeq = vi.fn().mockResolvedValueOnce({
			outBinds: {valid: 0},
		});
		/** @type {any} */
		const connection = {execute: mockExecuteSeq};
		/** @type {any} */
		const options = {...defaultOptions, requestValidationFunction: 'check_valid'};
		const cache = new Cache();

		await assert.rejects(
			async () => {
				await sanitizeProcName('myproc_invalid', connection, options, cache);
			},
			(err) => {
				assert.ok(err instanceof RequestError);
				assert.ok(err.message.includes('not valid according to the request validation function'));
				return true;
			},
		);
	});
});
