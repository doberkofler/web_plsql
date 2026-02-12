import {describe, it, expect} from 'vitest';
import {traceEntrySchema} from './types.js';

describe('Trace Zod Schemas', () => {
	it('should validate full trace entry', () => {
		const valid = {
			id: 'abc',
			timestamp: new Date().toISOString(),
			source: '127.0.0.1',
			url: '/pls/proc',
			method: 'GET',
			status: 'success',
			duration: 123,
			procedure: 'MY_PROC',
			parameters: {p1: 'v1'},
			uploads: [{originalname: 'o.txt', mimetype: 'text/plain', size: 10}],
			downloads: {fileType: 'B', fileSize: 100},
			html: '<html></html>',
			cookies: {c1: 'v1'},
			headers: {h1: 'v1'},
			cgi: {REMOTE_ADDR: '127.0.0.1'},
		};
		expect(traceEntrySchema.parse(valid)).toEqual(valid);
	});

	it('should allow optional fields', () => {
		const minimal = {
			id: 'abc',
			timestamp: new Date().toISOString(),
			source: '127.0.0.1',
			url: '/pls/proc',
			method: 'GET',
			status: 'success',
			duration: 123,
		};
		expect(traceEntrySchema.parse(minimal)).toEqual(minimal);
	});
});
