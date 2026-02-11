import {describe, it, expect, vi} from 'vitest';
import {inspect, getFormattedMessage, toTable} from '../../util/trace.ts';
import {StatsManager} from '../../util/statsManager.ts';
import {sanitizeProcName} from '../../handler/plsql/procedureSanitize.ts';
import {RequestError} from '../../handler/plsql/requestError.ts';
import {OWAPageStream} from '../../handler/plsql/owaPageStream.ts';
import {ProcedureError} from '../../handler/plsql/procedureError.ts';
import {Cache} from '../../util/cache.ts';
import type {Connection} from '../../util/db.ts';
import type {configPlSqlHandlerType} from '../../types.ts';

vi.mock('../../handler/plsql/errorPage.ts', () => ({
	errorPage: vi.fn(),
}));

vi.mock('../../handler/plsql/procedure.ts', () => ({
	invokeProcedure: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../handler/plsql/cgi.ts', () => ({
	getCGI: vi.fn().mockReturnValue({}),
}));

vi.mock('../../handler/plsql/upload.ts', () => ({
	getFiles: vi.fn().mockReturnValue([]),
}));

describe('handler/plsql coverage tests', () => {
	describe('trace.js coverage', () => {
		it('should handle JSON.stringify error in inspect', () => {
			const circular: any = {};
			circular.self = circular;
			const result = inspect(circular);
			expect(result).toBeTruthy();
		});

		it('should handle number type in bindTypeToString', () => {
			const para = {
				message: 'test',
				sql: 'SELECT * FROM dual',
				bind: {
					p1: {dir: 1, type: 123, val: 'val'},
				},
			};

			const output = getFormattedMessage(para as any);
			expect(output.text).toContain('123');
		});

		it('should handle object type with name in bindTypeToString', () => {
			const para = {
				message: 'test',
				sql: 'SELECT * FROM dual',
				bind: {
					p1: {dir: 1, type: {name: 'CUSTOM_TYPE'}, val: 'val'},
				},
			};

			const output = getFormattedMessage(para as any);
			expect(output.text).toContain('CUSTOM_TYPE');
		});

		it('should throw error when toTable receives empty head', () => {
			expect(() => toTable([], [])).toThrow('head cannot be empty');
		});
	});

	describe('statsManager.js coverage', () => {
		it('should handle timer unref when available', () => {
			const manager = new StatsManager({
				sampleSystem: true,
				intervalMs: 10000,
			});

			expect(manager._timer).toBeDefined();

			manager.stop();
		});
	});

	describe('procedureSanitize.js coverage', () => {
		it('should handle null/undefined in removeSpecialCharacters', async () => {
			const mockConn = {
				execute: vi.fn().mockResolvedValue({outBinds: {resolved: 'PROC'}}),
			} as unknown as Connection;
			const procCache = new Cache<string>();

			// @ts-expect-error - testing null input
			await expect(sanitizeProcName(null, mockConn, {} as configPlSqlHandlerType, procCache)).rejects.toThrow();
		});

		it('should throw error when resolved name is empty', async () => {
			const mockConn = {
				execute: vi.fn().mockResolvedValue({outBinds: {resolved: ''}}),
			} as unknown as Connection;
			const procCache = new Cache<string>();

			await expect(sanitizeProcName('test', mockConn, {} as configPlSqlHandlerType, procCache)).rejects.toThrow('Could not resolve procedure name');
		});

		it('should handle database error in loadRequestValid', async () => {
			const mockExecuteFail = vi.fn().mockImplementation((sql: string) => {
				if (sql.includes('check_valid')) {
					throw new Error('DB Error');
				}
				return Promise.resolve({outBinds: {resolved: 'myproc'}});
			});

			const connection = {execute: mockExecuteFail} as unknown as Connection;
			const options = {
				exclusionList: [],
				requestValidationFunction: 'check_valid',
			} as unknown as configPlSqlHandlerType;
			const cache = new Cache<string>();

			await expect(sanitizeProcName('myproc', connection, options, cache)).rejects.toThrow(RequestError);
		});
	});

	describe('owaPageStream.js coverage', () => {
		it('should rethrow ProcedureError', async () => {
			const mockConn = {
				execute: vi.fn().mockRejectedValue(new ProcedureError('Test error', {}, 'SQL', {})),
			} as unknown as Connection;

			const stream = new OWAPageStream(mockConn);
			await expect(stream.fetchChunk()).rejects.toThrow(ProcedureError);
		});
	});
});
