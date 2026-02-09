import {describe, it, expect} from 'vitest';
import {traceRow} from '../../src/admin/js/templates/traceRow.js';
import type {TraceEntry} from '../../src/admin/js/types.js';

describe('Trace Templates', () => {
	it('should render trace row', () => {
		const trace: TraceEntry = {
			id: '123',
			timestamp: '2024-01-01T12:00:00Z',
			source: '1.2.3.4',
			url: '/test/url',
			method: 'GET',
			status: 'success',
			duration: 150.5,
			procedure: 'MY_PROC',
		};

		const result = traceRow(trace);
		expect(result).toContain('1.2.3.4');
		expect(result).toContain('/test/url');
		expect(result).toContain('success');
		expect(result).toContain('150.50 ms');
		expect(result).toContain('MY_PROC');
	});

	it('should handle missing procedure', () => {
		const trace: TraceEntry = {
			id: '123',
			timestamp: '2024-01-01T12:00:00Z',
			source: '1.2.3.4',
			url: '/test/url',
			method: 'GET',
			status: 'error',
			duration: 10,
		};

		const result = traceRow(trace);
		expect(result).toContain('error');
		expect(result).toContain('-');
	});
});
