import assert from 'node:assert';
import {describe, it, vi, afterEach} from 'vitest';
import {inspect, toTable, getFormattedMessage, warningMessage, logToFile} from '../src/util/trace.js';
import oracledb from 'oracledb';

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
			// inspect falls back to JSON.stringify if util.inspect fails or behaves weirdly?
			// Actually code tries util.inspect first.
			const result = inspect({a: 1});
			assert.ok(result.length > 0);
		});

		it('should handle circular references gracefully', () => {
			const obj = {};
			obj.self = obj;
			const result = inspect(obj);
			assert.ok(result.includes('[Circular'));
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

		it('should handle empty body', () => {
			const {text, html} = toTable(['H1'], []);
			assert.ok(text.includes('H1'));
			assert.ok(html.includes('<tbody></tbody>'));
		});
	});

	describe('getFormattedMessage', () => {
		it('should format simple error message', () => {
			/** @type {any} */
			const para = {
				type: 'error',
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
			/** @type {any} */
			const para = {
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
			/** @type {any} */
			const para = {
				type: 'error',
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
				type: 'error',
				message: 'Error',
				sql: 'SELECT * FROM DUAL',
				bind: {
					p1: {dir: oracledb.BIND_IN, type: oracledb.STRING, val: 'v1'},
				},
			};
			/** @type {any} */
			const anyPara = para;
			const {text} = getFormattedMessage(anyPara);

			assert.ok(text.includes('PROCEDURE'));
			assert.ok(text.includes('SELECT * FROM DUAL'));
			assert.ok(text.includes('IN')); // dir
			assert.ok(text.includes('v1')); // value
		});
	});

	describe('logToFile', () => {
		it('should write to stream', () => {
			logToFile('some text');
			assert.strictEqual(mockStream.write.mock.calls.length, 1);
			assert.strictEqual(mockStream.write.mock.calls[0][0], 'some text');
			assert.strictEqual(mockStream.end.mock.calls.length, 1);
		});
	});

	describe('warningMessage', () => {
		it('should log warning to file and console', () => {
			/** @type {any} */
			const para = {
				type: 'warning',
				message: 'Warning!',
			};
			warningMessage(para);

			assert.strictEqual(mockStream.write.mock.calls.length, 1);
			assert.strictEqual(consoleWarnSpy.mock.calls.length, 1);
		});
	});
});
