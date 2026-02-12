import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';

// Mock oracledb
vi.mock('oracledb', () => {
	const constants = {
		BIND_IN: 3001,
		BIND_OUT: 3002,
		BIND_INOUT: 3003,
		STRING: 2001,
		NUMBER: 2002,
		DATE: 2003,
		CURSOR: 2004,
		BUFFER: 2005,
		CLOB: 2006,
		BLOB: 2007,
		DB_TYPE_VARCHAR: 2008,
		DB_TYPE_CLOB: 2009,
		DB_TYPE_NUMBER: 2010,
		DB_TYPE_DATE: 2011,
	};

	return {
		default: {
			createPool: vi.fn(),
			...constants,
		},
		...constants,
	};
});

// Mock the mock implementation
vi.mock('./oracledb-mock.ts', () => {
	return {
		createPool: vi.fn(),
		setExecuteCallback: vi.fn(),
	};
});

describe('oracledb-provider', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.resetModules();
		process.env = {...originalEnv};
	});

	afterEach(() => {
		process.env = originalEnv;
		vi.clearAllMocks();
	});

	it('should use real oracledb when MOCK_ORACLE is not true', async () => {
		process.env.MOCK_ORACLE = 'false';

		// Import the module under test
		const provider = await import('./oracledb-provider.ts');
		const oracleMock = (await import('oracledb')).default;

		const config = {user: 'test'};
		await provider.createPool(config as any);

		expect(oracleMock.createPool).toHaveBeenCalledWith(config);
	});

	it('should use mock implementation when MOCK_ORACLE is true', async () => {
		process.env.MOCK_ORACLE = 'true';

		// Import the module under test
		const provider = await import('./oracledb-provider.ts');
		const internalMock = await import('./oracledb-mock.ts');

		const config = {user: 'test'};
		await provider.createPool(config as any);

		expect(internalMock.createPool).toHaveBeenCalledWith(config);
	});

	it('should export constants from oracledb', async () => {
		process.env.MOCK_ORACLE = 'false';
		// Import the module under test
		const provider = await import('./oracledb-provider.ts');
		const oracleMock = (await import('oracledb')).default;

		expect(provider.BIND_IN).toBe(oracleMock.BIND_IN);
		expect(provider.BIND_OUT).toBe(oracleMock.BIND_OUT);
		expect(provider.BIND_INOUT).toBe(oracleMock.BIND_INOUT);
		expect(provider.STRING).toBe(oracleMock.STRING);
		expect(provider.NUMBER).toBe(oracleMock.NUMBER);
		expect(provider.DATE).toBe(oracleMock.DATE);
		expect(provider.CURSOR).toBe(oracleMock.CURSOR);
		expect(provider.BUFFER).toBe(oracleMock.BUFFER);
		expect(provider.CLOB).toBe(oracleMock.CLOB);
		expect(provider.BLOB).toBe(oracleMock.BLOB);
		expect(provider.DB_TYPE_VARCHAR).toBe(oracleMock.DB_TYPE_VARCHAR);
		expect(provider.DB_TYPE_CLOB).toBe(oracleMock.DB_TYPE_CLOB);
		expect(provider.DB_TYPE_NUMBER).toBe(oracleMock.DB_TYPE_NUMBER);
		expect(provider.DB_TYPE_DATE).toBe(oracleMock.DB_TYPE_DATE);
	});
});
