import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest';
import {printError} from './printError.ts';

describe('printError', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-02T03:04:05.006Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('writes a formatted error block to stderr', () => {
		const writeSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

		printError('Something failed badly', {route: '/health'});

		expect(writeSpy).toHaveBeenCalledTimes(1);
		const output = writeSpy.mock.calls[0]?.[0];
		expect(typeof output).toBe('string');
		if (typeof output !== 'string') {
			throw new Error('Expected stderr output to be a string');
		}

		expect(output).toContain('ERROR');
		expect(output).toContain('Something failed badly');
		expect(output).toContain('UTC');
		expect(output).toContain('pid');
		expect(output).toContain('node');
		expect(output).toContain('route');
		expect(output).toContain('/health');
	});
});