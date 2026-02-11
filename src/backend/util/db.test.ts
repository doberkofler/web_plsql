import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {connectionValid, createPool, poolClose, poolsClose} from '../../../src/backend/util/db.ts';
import type {IDbPool, IDbConnection} from '../../../src/backend/util/db-types.ts';
import oracledb from 'oracledb';

// Helper to cast oracledb to a mockable object
type OracledbMock = {
	createPool: ReturnType<typeof vi.fn>;
	BIND_IN: number;
	STRING: number;
};

vi.mock('oracledb', () => ({
	default: {
		createPool: vi.fn(),
		BIND_IN: 1,
		STRING: 2,
	},
}));

describe('util/db', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.resetModules();
		process.env = {...originalEnv};
	});

	afterEach(() => {
		process.env = originalEnv;
		vi.clearAllMocks();
	});

	describe('Mock Mode', () => {
		it('should create a mock pool when MOCK_ORACLE is true', async () => {
			process.env.MOCK_ORACLE = 'true';
			const pool = await createPool({user: 'test'});
			expect(pool.constructor.name).toBe('MockPool');
		});

		it('should handle mock connections', async () => {
			process.env.MOCK_ORACLE = 'true';
			const pool = await createPool({});
			const conn = await pool.getConnection();
			expect(pool.connectionsInUse).toBe(1);

			const result = await conn.execute('SELECT 1 FROM DUAL');
			expect(result.rows).toEqual([]);

			const lob = await conn.createLob(2006); // CLOB
			expect(lob.constructor.name).toBe('MockLob');

			await conn.commit();
			await conn.rollback();
			await conn.release();
			expect(pool.connectionsInUse).toBe(0);
		});
	});

	describe('Real Adapter', () => {
		beforeEach(() => {
			process.env.MOCK_ORACLE = 'false';
		});

		describe('connectionValid', () => {
			it('should return true when connection is successfully established and released', async () => {
				const mockConnection = {
					release: vi.fn().mockResolvedValue(undefined),
				} as unknown as IDbConnection;

				const mockPool = {
					getConnection: vi.fn().mockResolvedValue(mockConnection),
				} as unknown as IDbPool;

				const result = await connectionValid(mockPool);
				expect(result).toBe(true);
				expect(mockPool.getConnection).toHaveBeenCalled();
				expect(mockConnection.release).toHaveBeenCalled();
			});

			it('should return false when connection fails', async () => {
				const mockPool = {
					getConnection: vi.fn().mockRejectedValue(new Error('Connection failed')),
				} as unknown as IDbPool;

				const result = await connectionValid(mockPool);
				expect(result).toBe(false);
			});
		});

		describe('createPool', () => {
			it('should create a pool successfully', async () => {
				const mockRealPool = {
					getConnection: vi.fn(),
					close: vi.fn(),
					connectionsOpen: 10,
					connectionsInUse: 5,
				};

				const oracledbMock = oracledb as unknown as OracledbMock;
				oracledbMock.createPool.mockResolvedValue(mockRealPool);

				const pool = await createPool({user: 'u'});
				expect(oracledbMock.createPool).toHaveBeenCalledWith({user: 'u'});
				expect(pool.connectionsOpen).toBe(10);
				expect(pool.connectionsInUse).toBe(5);
			});

			it('should wrap real connection and execute sql', async () => {
				const mockConn = {
					execute: vi.fn().mockResolvedValue({rows: [1]}),
					createLob: vi.fn().mockResolvedValue({}),
					commit: vi.fn(),
					rollback: vi.fn(),
					release: vi.fn(),
				};
				const mockRealPool = {
					getConnection: vi.fn().mockResolvedValue(mockConn),
					close: vi.fn(),
				};

				const oracledbMock = oracledb as unknown as OracledbMock;
				oracledbMock.createPool.mockResolvedValue(mockRealPool);

				const pool = await createPool({});
				const conn = await pool.getConnection();
				const result = await conn.execute('SELECT 1 FROM DUAL', {a: 1}, {autoCommit: true});

				expect(mockConn.execute).toHaveBeenCalledWith('SELECT 1 FROM DUAL', {a: 1}, {autoCommit: true});
				expect(result.rows).toEqual([1]);

				await conn.createLob(1);
				expect(mockConn.createLob).toHaveBeenCalled();

				await conn.commit();
				expect(mockConn.commit).toHaveBeenCalled();

				await conn.rollback();
				expect(mockConn.rollback).toHaveBeenCalled();

				await conn.release();
				expect(mockConn.release).toHaveBeenCalled();
			});
		});

		describe('poolClose', () => {
			it('should close the pool with 0 timeout', async () => {
				const mockPool = {
					close: vi.fn().mockResolvedValue(undefined),
				} as unknown as IDbPool;
				await poolClose(mockPool);
				expect(mockPool.close).toHaveBeenCalledWith(0);
			});

			it('should handle errors during pool close', async () => {
				const mockPool = {
					close: vi.fn().mockRejectedValue(new Error('Close failed')),
				} as unknown as IDbPool;
				await expect(poolClose(mockPool)).resolves.toBeUndefined();
			});

			it('should close real pool with default drainTime', async () => {
				const mockRealPool = {
					close: vi.fn().mockResolvedValue(undefined),
				};
				const oracledbMock = oracledb as unknown as OracledbMock;
				oracledbMock.createPool.mockResolvedValue(mockRealPool);

				const pool = await createPool({});
				await pool.close();
				expect(mockRealPool.close).toHaveBeenCalledWith(0);
			});
		});

		describe('poolsClose', () => {
			it('should close multiple pools', async () => {
				const mockPool1 = {
					close: vi.fn().mockResolvedValue(undefined),
				} as unknown as IDbPool;
				const mockPool2 = {
					close: vi.fn().mockResolvedValue(undefined),
				} as unknown as IDbPool;
				await poolsClose([mockPool1, mockPool2]);
				expect(mockPool1.close).toHaveBeenCalled();
				expect(mockPool2.close).toHaveBeenCalled();
			});
		});
	});
});
