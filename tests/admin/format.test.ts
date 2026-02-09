import {describe, it, expect} from 'vitest';
import {formatDuration, formatMs, formatDateTime} from '../../src/admin/js/util/format.js';

describe('Admin Utility Formatting', () => {
	describe('formatDuration', () => {
		it('should format durations correctly', () => {
			expect(formatDuration(0)).toBe('0 ms');
			expect(formatDuration(0.5)).toBe('500.00 ms');
			expect(formatDuration(60)).toBe('1m');
			expect(formatDuration(3661)).toBe('1h 1m 1s');
			expect(formatDuration(86400 + 3600 + 60 + 1)).toBe('1d 1h 1m 1s');
		});
	});

	describe('formatMs', () => {
		it('should format milliseconds correctly', () => {
			expect(formatMs(0)).toBe('0 ms');
			expect(formatMs(0.5)).toBe('500 μs');
			expect(formatMs(999)).toBe('999.00 ms');
			expect(formatMs(1000)).toBe('1s');
			expect(formatMs(1500)).toBe('1s'); // formatDuration floors seconds
		});
	});

	describe('formatDateTime', () => {
		it('should format ISO dates or return hyphen', () => {
			expect(formatDateTime('')).toBe('-');
			const now = new Date().toISOString();
			expect(formatDateTime(now)).toBe(new Date(now).toLocaleString());
		});
	});
});
