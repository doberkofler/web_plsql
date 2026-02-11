import assert from 'node:assert';
import {describe, it, vi, afterEach, expect} from 'vitest';
import {inspect, toTable, getFormattedMessage, warningMessage, logToFile, getBlock} from '../util/trace.ts';
import oracledb from 'oracledb';
import util from 'node:util';

// Mock rotating-file-stream
const mockStream = {
	write: vi.fn(),
	end: vi.fn(),
};
vi.mock('rotating-file-stream', () => ({
	createStream: vi.fn(() => mockStream),
}));

// Mock console.warn
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
	// Mock implementation
});

describe('util/trace', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('inspect', () => {
		it('should inspect simple object', () => {
			const obj = {a: 1};
			const result = inspect(obj);
			assert.ok(result.includes('a: 1') || result.includes('"a":1'));
		});

		it('should handle JSON stringify fallback', () => {
			const result = inspect({a: 1});
			assert.ok(result.length > 0);
		});

		it('should handle circular references gracefully', () => {
			const obj: any = {};
			obj.self = obj;
			const result = inspect(obj);
			assert.ok(result.includes('[Circular'));
		});

		it('should handle errors', () => {
			const obj = {
				get name() {
					throw new Error('inspect error');
				},
			};
			expect(inspect(obj)).toBeDefined();
		});

		it('should fall back to JSON.stringify and then to default message', () => {
			const utilInspectSpy = vi.spyOn(util, 'inspect').mockImplementation(() => {
				throw new Error('util.inspect failed');
			});

			// Test JSON.stringify fallback
			const obj = {a: 1};
			expect(inspect(obj)).toBe('{"a":1}');

			// Test final fallback
			const circular: any = {};
			circular.self = circular;
			const JSONStringifySpy = vi.spyOn(JSON, 'stringify').mockImplementation(() => {
				throw new Error('JSON.stringify failed');
			});

			expect(inspect(circular)).toBe('Unable to convert value to string');

			utilInspectSpy.mockRestore();
			JSONStringifySpy.mockRestore();
		});
	});

	describe('toTable', () => {
		it('should create table text and html', () => {
			const head = ['H1', 'H2'];
			const body = [
				['v1a', 'v2a'],
				['v1b', 'v2b'],
			];
			const {text, html} = toTable(head, body);

			assert.ok(text.includes('H1'));
			assert.ok(text.includes('H2'));
			assert.ok(text.includes('v1a'));
			assert.ok(html.includes('<table>'));
			assert.ok(html.includes('<th>H1</th>'));
		});

		it('should throw error if head is empty', () => {
			assert.throws(() => {
				toTable([], []);
			}, /head cannot be empty/);
		});

		it('should throw if head is empty', () => {
			expect(() => toTable([], [])).toThrow('head cannot be empty');
		});

		it('should handle empty body', () => {
			const {text, html} = toTable(['H1'], []);
			assert.ok(text.includes('H1'));
			assert.ok(html.includes('<tbody></tbody>'));
		});

		it('should handle missing values in rows', () => {
			const head = ['H1', 'H2'];
			const body = [['v1']]; // missing second column
			const {text, html} = toTable(head, body);
			expect(text).toContain('v1');
			expect(html).toContain('<td></td>');
		});

		it('should handle empty strings in columns', () => {
			const head = ['H1', 'H2', 'H3'];
			const body = [
				['', 'v2', ''],
				['v1', '', 'v3'],
			];
			const {text, html} = toTable(head, body);
			expect(text).toBeDefined();
			expect(html).toBeDefined();
		});
	});

	describe('getFormattedMessage', () => {
		it('should format simple error message', () => {
			const para = {
				type: 'error' as const,
				message: 'Something happened',
			};
			const {text, html} = getFormattedMessage(para);

			assert.ok(text.includes('ERROR'));
			assert.ok(text.includes('Something happened'));
			assert.ok(html.includes('<h1>'));
		});

		it('should format message with request', () => {
			const req = {
				originalUrl: '/url',
				method: 'GET',
				query: {q: '1'},
			};

			const para: any = {
				type: 'error',
				message: 'Error',
				req: req,
			};
			const {text} = getFormattedMessage(para);

			assert.ok(text.includes('REQUEST'));
			assert.ok(text.includes('/url'));
			assert.ok(text.includes('GET'));
		});

		it('should format message with environment', () => {
			const para = {
				type: 'error' as const,
				message: 'Error',
				environment: {ENV_VAR: 'value'},
			};
			const {text} = getFormattedMessage(para);

			assert.ok(text.includes('ENVIRONMENT'));
			assert.ok(text.includes('ENV_VAR'));
			assert.ok(text.includes('value'));
		});

		it('should format message with sql and bind', () => {
			const para = {
				type: 'error' as const,
				message: 'Error',
				sql: 'SELECT * FROM DUAL',
				bind: {
					p1: {dir: oracledb.BIND_IN, type: oracledb.STRING, val: 'v1'},
				},
			};
			const {text} = getFormattedMessage(para);

			assert.ok(text.includes('PROCEDURE'));
			assert.ok(text.includes('SELECT * FROM DUAL'));
			assert.ok(text.includes('IN')); // dir
			assert.ok(text.includes('v1')); // value
		});

		it('should handle various bind types and directions', () => {
			const para = {
				type: 'trace' as const,
				message: 'test',
				sql: 'SELECT 1 FROM DUAL',
				bind: {
					p1: {val: 'v1', dir: oracledb.BIND_IN, type: oracledb.STRING},
					p2: {val: 'v2', dir: oracledb.BIND_OUT, type: {name: 'custom_type'}},
					p3: {val: 'v3', dir: oracledb.BIND_INOUT, type: 2 as any},
					p4: {val: 'v4', dir: 999, type: undefined as any},
				},
				environment: {KEY: 'VALUE'},
			};

			const output = getFormattedMessage(para as any);
			expect(output.text).toContain('IN');
			expect(output.text).toContain('OUT');
			expect(output.text).toContain('INOUT');
			expect(output.text).toContain('custom_type');
			expect(output.text).toContain('ENVIRONMENT');
		});

		it('should handle missing request originalUrl', () => {
			const para: any = {
				type: 'error',
				message: 'test',
				req: {}, // missing originalUrl
			};
			const output = getFormattedMessage(para);
			const headerLine = output.text.split('\n').find((l) => l.startsWith('== '));
			expect(headerLine).not.toContain(' on ');
		});

		it('should use default type TRACE if none provided', () => {
			const para: any = {
				message: 'test message',
			};
			const output = getFormattedMessage(para);
			expect(output.text).toContain('TRACE at');
		});

		it('bindTypeToString should handle string type', () => {
			const para: any = {
				type: 'trace',
				message: 'test',
				sql: 'SELECT 1 FROM DUAL',
				bind: {
					p1: {val: 'v1', dir: oracledb.BIND_IN, type: 'VARCHAR2'},
				},
			};
			const output = getFormattedMessage(para);
			expect(output.text).toContain('VARCHAR2');
		});

		it('inspectBindParameter should return early if bind is empty', () => {
			const para: any = {
				type: 'trace',
				message: 'test',
				sql: 'SELECT 1 FROM DUAL',
				bind: {},
			};
			const output = getFormattedMessage(para);
			expect(output.text).toContain('PROCEDURE');
			expect(output.text).not.toContain('id | dir');
		});

		it('inspectEnvironment should return early if environment is empty', () => {
			const para: any = {
				type: 'trace',
				message: 'test',
				environment: {},
			};
			const output = getFormattedMessage(para);
			expect(output.text).toContain('ENVIRONMENT');
			expect(output.text).not.toContain('key | value');
		});

		it('addProcedure should catch errors from inspectBindParameter', () => {
			const throwingBind = new Proxy(
				{},
				{
					ownKeys() {
						throw new Error('Forced error in inspectBindParameter');
					},
				},
			);

			const para: any = {
				type: 'trace',
				message: 'test',
				sql: 'SELECT 1 FROM DUAL',
				bind: throwingBind,
			};
			const output = getFormattedMessage(para);
			expect(output.text).toContain('Unable to inspect bind parameter');
			expect(output.text).toContain('Forced error in inspectBindParameter');
		});

		it('inspectBindParameter should handle maxArraySize and maxSize', () => {
			const para: any = {
				type: 'trace',
				message: 'test',
				sql: 'SELECT 1 FROM DUAL',
				bind: {
					p1: {
						val: 'v1',
						dir: oracledb.BIND_IN,
						type: oracledb.STRING,
						maxArraySize: 10,
						maxSize: 2000,
					},
				},
			};
			const output = getFormattedMessage(para);
			expect(output.text).toContain('10');
			expect(output.text).toContain('2000');
		});

		it('isBindParameter should return false for null and non-object', () => {
			const para: any = {
				type: 'trace',
				message: 'test',
				sql: 'SELECT 1 FROM DUAL',
				bind: {
					p1: null,
					p2: 'simple string',
					p3: {not_a_bind_param: true},
				},
			};
			const output = getFormattedMessage(para);
			expect(output.text).toContain('simple string');
			expect(output.text).toContain('string');
			expect(output.text).toContain('not_a_bind_param');
		});

		it('toTable should handle potentially missing width index', () => {
			// This is a bit tricky as widths is calculated from head, but we can try to force the condition if possible
			// The current implementation is: const getWidth = (i: number): number => widths[i] ?? 0;
			// Since textHeader uses head.map((h, i) => ...getWidth(i)), it should always have an index
			// But we can test with a row that has more elements than head if that triggers anything
			const head = ['H1'];
			const body = [['v1', 'v2']];
			const {text} = toTable(head, body);
			expect(text).toContain('H1');
			expect(text).toContain('v1');
			expect(text).not.toContain('v2'); // Row is truncated by head.map
		});
	});

	describe('logToFile', () => {
		it('should write to stream', () => {
			logToFile('some text');
			assert.strictEqual(mockStream.write.mock.calls.length, 1);
			assert.strictEqual(mockStream.write.mock.calls[0]?.[0], 'some text');
			assert.strictEqual(mockStream.end.mock.calls.length, 1);
		});

		it('should use constants for rotation', () => {
			logToFile('test');
			expect(mockStream.write).toHaveBeenCalledWith('test');
		});
	});

	describe('warningMessage', () => {
		it('should log warning to file and console', () => {
			const para = {
				type: 'warning' as const,
				message: 'Warning!',
			};
			warningMessage(para);

			assert.strictEqual(mockStream.write.mock.calls.length, 1);
			assert.strictEqual(consoleWarnSpy.mock.calls.length, 1);
		});

		it('should call console.warn and logToFile', () => {
			const consoleWarnSpy2 = vi.spyOn(console, 'warn').mockImplementation(() => {
				// Mock implementation
			});
			warningMessage({
				type: 'warning',
				message: 'test warning',
			});
			expect(consoleWarnSpy2).toHaveBeenCalled();
			expect(mockStream.write).toHaveBeenCalled();
			consoleWarnSpy2.mockRestore();
		});
	});

	describe('getBlock', () => {
		it('should format title and body', () => {
			const result = getBlock('test title', 'test body');
			expect(result).toContain('TEST TITLE');
			expect(result).toContain('test body');
			expect(result).toContain('------------------------------');
		});
	});
});
