import {vi, afterEach} from 'vitest';

// Mock oracledb for all unit tests
vi.mock('oracledb', async () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const actual: any = await vi.importActual('oracledb');
	const mock = await import('./backend/util/oracledb-mock.ts');
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return {
		...actual,
		...mock, // Spread named exports from mock (MockConnection, MockPool, setExecuteCallback)
		// Override default export to include constants AND mock functions
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		default: {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			...actual.default,
			...mock.default,
		},
	};
});

// Global console mock
const originalWarn = console.warn;
const originalError = console.error;
const originalLog = console.log;

const shouldLog = () => process.env.DEBUG ?? process.env.VERBOSE;

/**
 * @param originalImpl - The original console method
 * @returns Mock function
 */
const mockConsole = (originalImpl: (...args: unknown[]) => void) => {
	return (...args: unknown[]) => {
		if (shouldLog()) {
			originalImpl(...args);
		}
	};
};

vi.spyOn(console, 'warn').mockImplementation(mockConsole(originalWarn));
vi.spyOn(console, 'error').mockImplementation(mockConsole(originalError));
vi.spyOn(console, 'log').mockImplementation(mockConsole(originalLog));

// Prevent process.exit(0) from killing the test runner
vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null): never => {
	if (code !== 0 && code !== undefined) {
		originalError('process.exit called with', code);
	}
	// We don't throw here to avoid unhandled errors in tests
	// but we must return never, so we'll just return as any
	return undefined as never;
});

afterEach(() => {
	// We don't restore mocks here because we want them to persist across all tests
	// but we might want to clear call history if tests are checking call counts
	vi.clearAllMocks();
});
