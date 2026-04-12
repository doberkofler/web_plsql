import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {installShutdown, forceShutdown} from '../../../src/backend/util/shutdown.ts';

describe('util/shutdown', () => {
	const processOnSpy = vi.spyOn(process, 'on').mockImplementation(() => process);
	const processKillSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);
	const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {
		/* ignore */
	});
	const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
		/* ignore */
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Restore is handled by clearAllMocks/spyOn behavior but good to be explicit if needed
	});

	it('should install shutdown handlers', () => {
		const handler = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
		installShutdown(handler);

		expect(processOnSpy).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
		expect(processOnSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
		expect(processOnSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
	});

	it('should handle unhandledRejection', () => {
		const handler = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

		// First instance for Error case
		installShutdown(handler);
		let rejectionCall = processOnSpy.mock.calls.find((call) => call[0] === 'unhandledRejection');
		let rejectionHandler = rejectionCall ? (rejectionCall[1] as any) : null;

		if (rejectionHandler) {
			// Test with Error object
			rejectionHandler(new Error('test error'));
			expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('test error'));
			expect(handler).toHaveBeenCalledTimes(1);
		}

		// Clear mocks to start fresh for next case
		vi.clearAllMocks();

		// Second instance for non-Error case
		installShutdown(handler);

		rejectionCall = processOnSpy.mock.calls.find((call) => call[0] === 'unhandledRejection');
		rejectionHandler = rejectionCall ? (rejectionCall[1] as any) : null;

		if (rejectionHandler) {
			// Test with non-Error object
			rejectionHandler('some reason');
			expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unhandled promise rejection'), 'some reason');
			expect(handler).toHaveBeenCalledTimes(1);

			// Test that subsequent calls return early because isShuttingDown = true
			rejectionHandler('some other reason');
			expect(handler).toHaveBeenCalledTimes(1); // Still 1
		}
	});

	it('should handle unhandledRejection catch block', async () => {
		const error = new Error('handler failed');
		const handler = vi.fn<() => Promise<void>>().mockRejectedValue(error);
		installShutdown(handler);

		const rejectionCall = processOnSpy.mock.calls.find((call) => call[0] === 'unhandledRejection');
		const rejectionHandler = rejectionCall ? (rejectionCall[1] as any) : null;

		const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

		if (rejectionHandler) {
			rejectionHandler(new Error('test error'));
			await new Promise(process.nextTick); // let the catch block execute
			expect(consoleErrorSpy).toHaveBeenCalledWith('Error during shutdown:', error);
			expect(processExitSpy).toHaveBeenCalledWith(1);
		}
	});

	it('should handle SIGTERM and early return if already shutting down', async () => {
		const handler = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
		installShutdown(handler);

		const sigtermCall = processOnSpy.mock.calls.find((call) => call[0] === 'SIGTERM');

		const sigtermHandler = sigtermCall ? (sigtermCall[1] as any) : null;
		if (sigtermHandler) {
			sigtermHandler();
			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Graceful shutdown'));
			expect(handler).toHaveBeenCalledTimes(1);

			// Should return early
			sigtermHandler();
			expect(handler).toHaveBeenCalledTimes(1);
		}
	});

	it('should handle SIGTERM catch block', async () => {
		const error = new Error('handler failed');
		const handler = vi.fn<() => Promise<void>>().mockRejectedValue(error);
		installShutdown(handler);

		const sigtermCall = processOnSpy.mock.calls.find((call) => call[0] === 'SIGTERM');
		const sigtermHandler = sigtermCall ? (sigtermCall[1] as any) : null;

		const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

		if (sigtermHandler) {
			sigtermHandler();
			await new Promise(process.nextTick); // let the catch block execute
			expect(consoleErrorSpy).toHaveBeenCalledWith('Error during shutdown:', error);
			expect(processExitSpy).toHaveBeenCalledWith(1);
		}
	});

	it('should handle SIGINT and early return if already shutting down', async () => {
		const handler = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
		installShutdown(handler);

		const sigintCall = processOnSpy.mock.calls.find((call) => call[0] === 'SIGINT');

		const sigintHandler = sigintCall ? (sigintCall[1] as any) : null;
		if (sigintHandler) {
			sigintHandler();
			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Graceful shutdown'));
			expect(handler).toHaveBeenCalledTimes(1);

			// Should return early
			sigintHandler();
			expect(handler).toHaveBeenCalledTimes(1);
		}
	});

	it('should handle SIGINT catch block', async () => {
		const error = new Error('handler failed');
		const handler = vi.fn<() => Promise<void>>().mockRejectedValue(error);
		installShutdown(handler);

		const sigintCall = processOnSpy.mock.calls.find((call) => call[0] === 'SIGINT');
		const sigintHandler = sigintCall ? (sigintCall[1] as any) : null;

		const processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

		if (sigintHandler) {
			sigintHandler();
			await new Promise(process.nextTick); // let the catch block execute
			expect(consoleErrorSpy).toHaveBeenCalledWith('Error during shutdown:', error);
			expect(processExitSpy).toHaveBeenCalledWith(1);
		}
	});

	it('should force shutdown', () => {
		forceShutdown();
		expect(processKillSpy).toHaveBeenCalledWith(process.pid, 'SIGTERM');
	});
});