import {describe, it, expect, vi, beforeEach} from 'vitest';
import oracledb from 'oracledb';
import {connectionValid, poolCreate, poolClose, poolsClose} from '../../../src/backend/util/oracle.ts';
import type {Connection, Pool} from 'oracledb';
import type {Mock} from 'vitest';

/**
 * Helper to cast oracledb to a mockable object while maintaining types
 */
type OracledbMock = {
	createPool: Mock;
};

vi.mock('oracledb', () => ({
	default: {
		createPool: vi.fn(),
	},
}));

describe('util/oracle', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('connectionValid', () => {
		it('should return true when connection is successfully established and released', async () => {
			const mockConnection = {
				release: vi.fn().mockResolvedValue(undefined),
			} as unknown as Connection;
			const mockPool = {
				getConnection: vi.fn().mockResolvedValue(mockConnection),
			} as unknown as Pool;

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
			} as unknown as Pool;

			const result = await connectionValid(mockPool);
			expect(result).toBe(false);
		});
	});

	describe('poolCreate', () => {
		it('should create and validate a pool successfully', async () => {
			const mockConnection = {
				release: vi.fn().mockResolvedValue(undefined),
			} as unknown as Connection;
			const mockPool = {
				getConnection: vi.fn().mockResolvedValue(mockConnection),
				close: vi.fn(),
			} as unknown as Pool;

			const oracledbMock = oracledb as unknown as OracledbMock;
			oracledbMock.createPool.mockResolvedValue(mockPool);

			const pool = await poolCreate('user', 'pass', 'xe');
			expect(pool).toBe(mockPool);
			expect(oracledbMock.createPool).toHaveBeenCalled();
		});

		it('should throw error and close pool if validation fails', async () => {
			const mockPool = {
				getConnection: vi.fn().mockRejectedValue(new Error('Invalid')),
				close: vi.fn().mockResolvedValue(undefined),
			} as unknown as Pool;

			const oracledbMock = oracledb as unknown as OracledbMock;
			oracledbMock.createPool.mockResolvedValue(mockPool);

			await expect(poolCreate('user', 'pass', 'xe')).rejects.toThrow('Unable to connect');
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockPool.close).toHaveBeenCalledWith(0);
		});
	});

	describe('poolClose', () => {
		it('should close the pool with 0 timeout', async () => {
			const mockPool = {
				close: vi.fn().mockResolvedValue(undefined),
			} as unknown as Pool;
			await poolClose(mockPool);
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockPool.close).toHaveBeenCalledWith(0);
		});

		it('should handle errors during pool close', async () => {
			const mockPool = {
				close: vi.fn().mockRejectedValue(new Error('Close failed')),
			} as unknown as Pool;
			// poolClose swallows the error internally as per implementation
			await expect(poolClose(mockPool)).resolves.toBeUndefined();
		});
	});

	describe('poolsClose', () => {
		it('should close multiple pools', async () => {
			const mockPool1 = {
				close: vi.fn().mockResolvedValue(undefined),
			} as unknown as Pool;
			const mockPool2 = {
				close: vi.fn().mockResolvedValue(undefined),
			} as unknown as Pool;
			await poolsClose([mockPool1, mockPool2]);
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockPool1.close).toHaveBeenCalled();
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockPool2.close).toHaveBeenCalled();
		});
	});
});
