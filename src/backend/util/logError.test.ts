import {beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('./trace.ts', () => ({
	logToFile: vi.fn<(text: string) => void>(),
}));

vi.mock('./printError.ts', () => ({
	printError: vi.fn<(message: string, meta?: Record<string, string>) => void>(),
}));

vi.mock('./errorToString.ts', () => ({
	errorToString: vi.fn<(value: unknown) => string>(),
}));

vi.mock('./jsonLogger.ts', () => ({
	jsonLogger: {
		log: vi.fn<(entry: {timestamp?: string; type: string; message: string}) => void>(),
	},
}));

import {logError} from './logError.ts';
import {logToFile} from './trace.ts';
import {printError} from './printError.ts';
import {errorToString} from './errorToString.ts';
import {jsonLogger} from './jsonLogger.ts';

describe('logError', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('logs and prints Error instances using errorToString', () => {
		vi.mocked(errorToString).mockReturnValue('converted error');

		logError(new Error('boom'));

		expect(errorToString).toHaveBeenCalledTimes(1);
		expect(logToFile).toHaveBeenCalledWith('converted error');
		expect(printError).toHaveBeenCalledWith('converted error');
		expect(jsonLogger.log).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'error',
				message: 'converted error',
				timestamp: expect.any(String),
			}),
		);
	});

	it('logs and prints string errors directly', () => {
		logError('plain error');

		expect(errorToString).not.toHaveBeenCalled();
		expect(logToFile).toHaveBeenCalledWith('plain error');
		expect(printError).toHaveBeenCalledWith('plain error');
		expect(jsonLogger.log).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'error',
				message: 'plain error',
				timestamp: expect.any(String),
			}),
		);
	});
});