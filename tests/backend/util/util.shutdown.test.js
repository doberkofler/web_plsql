import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {installShutdown, forceShutdown} from '../../../src/util/shutdown.js';

describe('util/shutdown', () => {
	const processOnSpy = vi.spyOn(process, 'on').mockImplementation(() => process);
	const processKillSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);
	const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation((..._args) => {
		/* ignore */
	});
	const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((..._args) => {
		/* ignore */
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Restore is handled by clearAllMocks/spyOn behavior but good to be explicit if needed
	});

	it('should install shutdown handlers', () => {
		const handler = vi.fn();
		installShutdown(handler);

		expect(processOnSpy).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
		expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
		expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
	});

	it('should handle unhandledRejection', () => {
		const handler = vi.fn().mockResolvedValue(undefined);
		installShutdown(handler);

		const rejectionCall = processOnSpy.mock.calls.find((call) => call[0] === 'unhandledRejection');
		const rejectionHandler = rejectionCall ? rejectionCall[1] : null;

		if (rejectionHandler) {
			// Test with Error object
			rejectionHandler(new Error('test error'));
			expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('test error'));
			expect(handler).toHaveBeenCalled();

			// Test with non-Error object
			rejectionHandler('some reason');
			expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unhandled promise rejection'), 'some reason');
		}
	});

	it('should handle SIGTERM', () => {
		const handler = vi.fn().mockResolvedValue(undefined);
		installShutdown(handler);

		const sigtermCall = processOnSpy.mock.calls.find((call) => call[0] === 'SIGTERM');
		const sigtermHandler = sigtermCall ? sigtermCall[1] : null;
		if (sigtermHandler) {
			sigtermHandler();
			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Graceful shutdown'));
			expect(handler).toHaveBeenCalled();
		}
	});

	it('should handle SIGINT', () => {
		const handler = vi.fn().mockResolvedValue(undefined);
		installShutdown(handler);

		const sigintCall = processOnSpy.mock.calls.find((call) => call[0] === 'SIGINT');
		const sigintHandler = sigintCall ? sigintCall[1] : null;
		if (sigintHandler) {
			sigintHandler();
			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Graceful shutdown'));
			expect(handler).toHaveBeenCalled();
		}
	});

	it('should force shutdown', () => {
		forceShutdown();
		expect(processKillSpy).toHaveBeenCalledWith(process.pid, 'SIGTERM');
	});
});
