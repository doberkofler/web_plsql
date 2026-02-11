import {describe, it, expect, vi, beforeEach} from 'vitest';
import {connectionValid, createPool, poolClose, poolsClose} from '../../../src/backend/util/db.ts';
import type {IDbPool, IDbConnection} from '../../../src/backend/util/db-types.ts';
import oracledb from 'oracledb';

// Helper to cast oracledb to a mockable object
type OracledbMock = {
	createPool: ReturnType<typeof vi.fn>;
};

vi.mock('oracledb', () => ({
	default: {
		createPool: vi.fn(),
	},
}));

describe('util/db (Real Adapter)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
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
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockPool.getConnection).toHaveBeenCalled();
			// eslint-disable-next-line @typescript-eslint/unbound-method
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
			// Mock the object returned by oracledb.createPool
			const mockRealPool = {
				getConnection: vi.fn(),
				close: vi.fn(),
				connectionsOpen: 0,
				connectionsInUse: 0,
			};

			const oracledbMock = oracledb as unknown as OracledbMock;
			oracledbMock.createPool.mockResolvedValue(mockRealPool);

			// createPool returns an IDbPool (wrapper)
			const pool = await createPool({user: 'u', password: 'p', connectString: 's'});

			expect(oracledbMock.createPool).toHaveBeenCalled();
			expect(pool).toBeDefined();
		});

		it('should close pool if it exists', async () => {
			const mockRealPool = {
				close: vi.fn().mockResolvedValue(undefined),
			};

			const oracledbMock = oracledb as unknown as OracledbMock;
			oracledbMock.createPool.mockResolvedValue(mockRealPool);

			const pool = await createPool({user: 'u', password: 'p', connectString: 's'});
			await pool.close(0);

			// Verify close was called
			expect(mockRealPool.close).toHaveBeenCalled();
		});
	});

	describe('poolClose', () => {
		it('should close the pool with 0 timeout', async () => {
			const mockPool = {
				close: vi.fn().mockResolvedValue(undefined),
			} as unknown as IDbPool;
			await poolClose(mockPool);
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockPool.close).toHaveBeenCalledWith(0);
		});

		it('should handle errors during pool close', async () => {
			const mockPool = {
				close: vi.fn().mockRejectedValue(new Error('Close failed')),
			} as unknown as IDbPool;
			// poolClose swallows the error internally as per implementation
			await expect(poolClose(mockPool)).resolves.toBeUndefined();
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
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockPool1.close).toHaveBeenCalled();
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockPool2.close).toHaveBeenCalled();
		});
	});
});
