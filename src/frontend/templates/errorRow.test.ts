import {describe, it, expect} from 'vitest';
import {errorRow} from './errorRow.ts';
import {type logEntryType} from '../types.ts';

describe('templates/errorRow', () => {
	it('should render error row with full data', () => {
		const errorData: logEntryType = {
			timestamp: '2024-01-01T12:00:00Z',
			type: 'error',
			message: 'Test error',
			req: {
				method: 'GET',
				url: '/test',
			},
			details: {
				fullMessage: 'Full error message here',
			},
		};

		const result = errorRow(errorData);
		expect(result).toContain('Test error');
		expect(result).toContain('GET');
		expect(result).toContain('/test');
		expect(result).toContain('Full error message here');
	});

	it('should handle missing optional fields', () => {
		const errorData: logEntryType = {
			timestamp: '2024-01-01T12:00:00Z',
			type: 'error',
			message: 'Test error',
			req: undefined,
			details: undefined,
		};

		const result = errorRow(errorData);
		expect(result).toContain('Test error');
		expect(result).toContain('title="Method: -"');
		expect(result).toContain('title="URL: -"');
	});

	it('should handle req with missing method', () => {
		const errorData: logEntryType = {
			timestamp: '2024-01-01T12:00:00Z',
			type: 'error',
			message: 'Error without method',
			req: {
				url: '/api/endpoint',
			},
			details: undefined,
		};

		const result = errorRow(errorData);
		expect(result).toContain('Error without method');
		expect(result).toContain('>-</');
		expect(result).toContain('/api/endpoint');
	});

	it('should handle req with missing url', () => {
		const errorData: logEntryType = {
			timestamp: '2024-01-01T12:00:00Z',
			type: 'error',
			message: 'Error without url',
			req: {
				method: 'POST',
			},
			details: undefined,
		};

		const result = errorRow(errorData);
		expect(result).toContain('Error without url');
		expect(result).toContain('POST');
		expect(result).toContain('title="URL: -"');
	});

	it('should handle details without fullMessage', () => {
		const errorData: logEntryType = {
			timestamp: '2024-01-01T12:00:00Z',
			type: 'error',
			message: 'Error without details',
			req: {
				method: 'GET',
				url: '/test',
			},
			details: {},
		};

		const result = errorRow(errorData);
		expect(result).toContain('Error without details');
		expect(result).toContain('title="Click for details: "');
	});

	it('should handle details with empty fullMessage', () => {
		const errorData: logEntryType = {
			timestamp: '2024-01-01T12:00:00Z',
			type: 'error',
			message: 'Error with empty details',
			req: {
				method: 'GET',
				url: '/test',
			},
			details: {
				fullMessage: '',
			},
		};

		const result = errorRow(errorData);
		expect(result).toContain('Error with empty details');
		expect(result).toContain('title="Click for details: "');
	});

	it('should render timestamp in locale format', () => {
		const errorData: logEntryType = {
			timestamp: '2024-06-15T10:30:00.000Z',
			type: 'error',
			message: 'Timestamp test',
			req: undefined,
			details: undefined,
		};

		const result = errorRow(errorData);
		expect(result).toContain('<td title="Timestamp:');
	});

	it('should handle special characters in message', () => {
		const errorData: logEntryType = {
			timestamp: '2024-01-01T12:00:00Z',
			type: 'error',
			message: 'Error with <script>alert("xss")</script>',
			req: undefined,
			details: undefined,
		};

		const result = errorRow(errorData);
		expect(result).toContain('Error with <script>alert');
	});
});
