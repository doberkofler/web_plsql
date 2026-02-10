import assert from 'node:assert';
import {describe, it, vi, expect} from 'vitest';
import {sanitizeProcName} from '../../../../src/backend/handler/plsql/procedureSanitize.ts';
import {RequestError} from '../../../../src/backend/handler/plsql/requestError.ts';
import {Cache} from '../../../../src/backend/util/cache.ts';
import type {Connection} from 'oracledb';
import type {configPlSqlHandlerType} from '../../../../src/backend/types.ts';

describe('handler/plsql/procedureSanitize', () => {
	const mockExecute = vi.fn().mockResolvedValue({
		outBinds: {resolved: 'myproc'},
	});

	const mockConnection = {execute: mockExecute} as unknown as Connection;

	const defaultOptions = {
		exclusionList: [],
		requestValidationFunction: '',
	} as unknown as configPlSqlHandlerType;

	it('should return sanitized procedure name', async () => {
		const conn = mockConnection;
		const cache = new Cache<string>();
		const result = await sanitizeProcName('MyProc', conn, defaultOptions, cache);
		assert.strictEqual(result, 'myproc');
	});

	it('should remove special characters', async () => {
		const conn = mockConnection;
		const cache = new Cache<string>();
		const result = await sanitizeProcName('My-Proc!', conn, defaultOptions, cache);
		assert.strictEqual(result, 'myproc');
	});

	it('should throw error if procedure is in default exclusion list', async () => {
		const procName = 'sys.evil';
		const conn = mockConnection;
		const cache = new Cache<string>();
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
		const options = {...defaultOptions, exclusionList: ['custom.']};
		const procName = 'custom.evil';
		const conn = mockConnection;
		const cache = new Cache<string>();
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

		const connection = {execute: mockExecuteSeq} as unknown as Connection;
		const options = {...defaultOptions, requestValidationFunction: 'check_valid'};
		const cache = new Cache<string>();

		const result = await sanitizeProcName('myproc', connection, options, cache);
		assert.strictEqual(result, 'myproc');
		assert.strictEqual(mockExecuteSeq.mock.calls.length, 2);
	});

	it('should use cached resolution in resolveProcedureName', async () => {
		const cache = new Cache<string>();
		cache.set('myproc', 'SCHEMA.MYPROC');

		const connection = {execute: vi.fn()} as unknown as Connection;

		const result = await sanitizeProcName('myproc', connection, defaultOptions, cache);
		assert.strictEqual(result, 'SCHEMA.MYPROC');

		assert.strictEqual((connection.execute as any).mock.calls.length, 0);
	});

	it('should handle resolveProcedureName failure', async () => {
		const mockExecuteFail = vi.fn().mockRejectedValue(new Error('ORA-00942'));

		const connection = {execute: mockExecuteFail} as unknown as Connection;
		const cache = new Cache<string>();

		await assert.rejects(
			async () => {
				await sanitizeProcName('badproc', connection, defaultOptions, cache);
			},
			(err) => {
				assert.ok(err instanceof RequestError);
				assert.ok(err.message.includes('not found or not accessible'));
				return true;
			},
		);
	});

	it('should handle requestValidationFunction caching', async () => {
		const mockExecuteSeq = vi.fn().mockImplementation((sql: string) => {
			if (sql.includes('check_valid')) {
				return Promise.resolve({outBinds: {valid: 1}});
			}
			return Promise.resolve({outBinds: {resolved: 'myproc'}});
		});

		const connection = {execute: mockExecuteSeq} as unknown as Connection;
		const options = {...defaultOptions, requestValidationFunction: 'check_valid'};
		const cache = new Cache<string>();

		// First call: validation hit DB, resolution hit DB
		await sanitizeProcName('myproc_unique_1', connection, options, cache);
		// Second call: validation hit DB (different name), resolution hit DB
		await sanitizeProcName('myproc_unique_2', connection, options, cache);

		// 2 validation calls + 2 resolution calls = 4 calls total
		assert.strictEqual(mockExecuteSeq.mock.calls.length, 4);
	});

	it('should handle zod parsing failure in loadRequestValid', async () => {
		const mockExecuteFail = vi.fn().mockImplementation((sql: string) => {
			if (sql.includes('check_valid')) {
				return Promise.resolve({outBinds: {valid: 'not-a-number'}});
			}
			return Promise.resolve({outBinds: {resolved: 'myproc'}});
		});

		const connection = {execute: mockExecuteFail} as unknown as Connection;
		const options = {...defaultOptions, requestValidationFunction: 'check_valid'};
		const cache = new Cache<string>();

		try {
			// Using a fresh name to ensure it doesn't hit any cache from previous tests
			await sanitizeProcName('myproc_fresh_zod', connection, options, cache);
			assert.fail('Should have thrown');
		} catch (err) {
			const error = err as Error;
			assert.ok(error.message.includes('Internal error when parsing'), `Actual message: ${error.message}`);
		}
	});

	it('should throw error if request validation function returns invalid', async () => {
		const mockExecuteSeq = vi.fn().mockResolvedValueOnce({
			outBinds: {valid: 0},
		});

		const connection = {execute: mockExecuteSeq} as unknown as Connection;
		const options = {...defaultOptions, requestValidationFunction: 'check_valid'};
		const cache = new Cache<string>();

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

	it('should handle resolveProcedureName returning null/empty', async () => {
		const mockExecuteNull = vi.fn().mockResolvedValue({
			outBinds: {resolved: null},
		});

		const connection = {execute: mockExecuteNull} as unknown as Connection;
		const cache = new Cache<string>();

		await assert.rejects(
			async () => {
				await sanitizeProcName('nullproc', connection, defaultOptions, cache);
			},
			(err) => {
				assert.ok((err as Error).message.includes('not found or not accessible'));
				return true;
			},
		);
	});

	it('should handle special characters in removeSpecialCharacters', async () => {
		// Test various characters including those allowed: . _ # $
		const input = 'abc!@%^&*()_+={}|[]\\:";\'<>?,./~`123_#$.';
		const mockExecute = vi.fn().mockResolvedValue({outBinds: {resolved: 'CLEANED'}});

		const connection = {execute: mockExecute} as unknown as Connection;
		const cache = new Cache<string>();

		await sanitizeProcName(input, connection, defaultOptions, cache);
		expect(mockExecute).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				name: expect.objectContaining({val: 'abc_.123_#$.'}),
			}),
		);
	});

	it('should handle null/undefined procedure name', async () => {
		const mockExecute = vi.fn().mockResolvedValue({outBinds: {resolved: 'DEFAULT'}});

		const connection = {execute: mockExecute} as unknown as Connection;
		const cache = new Cache<string>();

		// @ts-expect-error - testing null input
		await expect(sanitizeProcName(null, connection, defaultOptions, cache)).rejects.toThrow();
		// @ts-expect-error - testing undefined input
		await expect(sanitizeProcName(undefined, connection, defaultOptions, cache)).rejects.toThrow();
	});

	it('should handle resolveProcedureName returning NULL in outBinds', async () => {
		const mockExecuteNull = vi.fn().mockResolvedValue({
			outBinds: {resolved: undefined},
		});

		const connection = {execute: mockExecuteNull} as unknown as Connection;
		const cache = new Cache<string>();

		await expect(sanitizeProcName('nullproc', connection, defaultOptions, cache)).rejects.toThrow('not found or not accessible');
	});
});
