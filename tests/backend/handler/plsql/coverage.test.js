import {describe, it, expect, vi} from 'vitest';
import {inspect, getFormattedMessage, toTable} from '../../../../src/util/trace.js';
import {StatsManager} from '../../../../src/util/statsManager.js';
import {sanitizeProcName} from '../../../../src/handler/plsql/procedureSanitize.js';
import {RequestError} from '../../../../src/handler/plsql/requestError.js';
import {OWAPageStream} from '../../../../src/handler/plsql/owaPageStream.js';
import {ProcedureError} from '../../../../src/handler/plsql/procedureError.js';
import {Cache} from '../../../../src/util/cache.js';

vi.mock('../../../../src/handler/plsql/errorPage.js', () => ({
	errorPage: vi.fn(),
}));

vi.mock('../../../../src/handler/plsql/procedure.js', () => ({
	invokeProcedure: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../src/handler/plsql/cgi.js', () => ({
	getCGI: vi.fn().mockReturnValue({}),
}));

vi.mock('../../../../src/handler/plsql/upload.js', () => ({
	getFiles: vi.fn().mockReturnValue([]),
}));

describe('handler/plsql coverage tests', () => {
	describe('trace.js coverage', () => {
		it('should handle JSON.stringify error in inspect', () => {
			const circular = {};
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
			const output = getFormattedMessage(/** @type {any} */ (para));
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
			const output = getFormattedMessage(/** @type {any} */ (para));
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
			};
			const procCache = new Cache();

			// @ts-expect-error - testing null input
			await expect(sanitizeProcName(null, /** @type {any} */ (mockConn), /** @type {any} */ ({}), procCache)).rejects.toThrow();
		});

		it('should throw error when resolved name is empty', async () => {
			const mockConn = {
				execute: vi.fn().mockResolvedValue({outBinds: {resolved: ''}}),
			};
			const procCache = new Cache();

			await expect(sanitizeProcName('test', /** @type {any} */ (mockConn), /** @type {any} */ ({}), procCache)).rejects.toThrow(
				'Could not resolve procedure name',
			);
		});

		it('should handle database error in loadRequestValid', async () => {
			const mockExecuteFail = vi.fn().mockImplementation((sql) => {
				if (sql.includes('check_valid')) {
					throw new Error('DB Error');
				}
				return Promise.resolve({outBinds: {resolved: 'myproc'}});
			});

			/** @type {any} */
			const connection = {execute: mockExecuteFail};
			/** @type {any} */
			const options = {exclusionList: [], requestValidationFunction: 'check_valid'};
			const cache = new Cache();

			await expect(sanitizeProcName('myproc', connection, options, cache)).rejects.toThrow(RequestError);
		});
	});

	describe('owaPageStream.js coverage', () => {
		it('should rethrow ProcedureError', async () => {
			const mockConn = {
				execute: vi.fn().mockRejectedValue(new ProcedureError('Test error', {}, 'SQL', {})),
			};

			const stream = new OWAPageStream(/** @type {any} */ (mockConn));
			await expect(stream.fetchChunk()).rejects.toThrow(ProcedureError);
		});
	});
});
