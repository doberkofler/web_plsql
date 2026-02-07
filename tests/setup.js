import {vi, afterEach} from 'vitest';

// Global console mock
const originalWarn = console.warn;
const originalError = console.error;
const originalLog = console.log;

const shouldLog = () => process.env.DEBUG ?? process.env.VERBOSE;

/**
 * @param {(...args: any[]) => void} originalImpl
 * @returns {(...args: any[]) => void}
 */
const mockConsole = (originalImpl) => {
	return (/** @type {any[]} */ ...args) => {
		if (shouldLog()) {
			originalImpl(...args);
		}
	};
};

vi.spyOn(console, 'warn').mockImplementation(mockConsole(originalWarn));
vi.spyOn(console, 'error').mockImplementation(mockConsole(originalError));
vi.spyOn(console, 'log').mockImplementation(mockConsole(originalLog));

afterEach(() => {
	// We don't restore mocks here because we want them to persist across all tests
	// but we might want to clear call history if tests are checking call counts
	vi.clearAllMocks();
});
