import {describe, it, expect} from 'vitest';
import {inspect, toTable, getFormattedMessage} from '../src/util/trace.js';
import oracledb from 'oracledb';

describe('util/trace extra', () => {
	it('inspect should handle errors', () => {
		const obj = {
			get name() {
				throw new Error('inspect error');
			},
		};
		// util.inspect might handle it, but let's try to trigger the catch
		expect(inspect(obj)).toBeDefined();
	});

	it('toTable should throw if head is empty', () => {
		expect(() => toTable([], [])).toThrow('head cannot be empty');
	});

	it('getFormattedMessage should handle various bind types and directions', () => {
		/** @type {any} */
		const para = {
			type: 'trace',
			message: 'test',
			sql: 'SELECT 1 FROM DUAL',
			bind: {
				p1: {val: 'v1', dir: oracledb.BIND_IN, type: oracledb.STRING},
				p2: {val: 'v2', dir: oracledb.BIND_OUT, type: {name: 'custom_type'}},
				p3: {val: 'v3', dir: oracledb.BIND_INOUT, type: 2},
				p4: {val: 'v4', dir: 999, type: undefined},
			},
			environment: {KEY: 'VALUE'},
		};

		const output = getFormattedMessage(para);
		expect(output.text).toContain('IN');
		expect(output.text).toContain('OUT');
		expect(output.text).toContain('INOUT');
		expect(output.text).toContain('custom_type');
		expect(output.text).toContain('ENVIRONMENT');
	});

	it('getFormattedMessage should handle missing request originalUrl', () => {
		/** @type {any} */
		const para = {
			type: 'error',
			message: 'test',
			req: {}, // missing originalUrl
		};
		const output = getFormattedMessage(para);
		// Check that it doesn't have the " on URL" part
		const headerLine = output.text.split('\n').find((l) => l.startsWith('== '));
		expect(headerLine).not.toContain(' on ');
	});
});
