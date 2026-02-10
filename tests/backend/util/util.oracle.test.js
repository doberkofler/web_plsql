import {describe, it, expect, vi, beforeEach} from 'vitest';
import oracledb from 'oracledb';
import {connectionValid, poolCreate, poolClose, poolsClose} from '../../../src/util/oracle.js';

/**
 * @typedef {import('oracledb').Connection} Connection
 * @typedef {import('oracledb').Pool} Pool
 */

/**
 * Interface for mocked Vitest functions to satisfy TypeScript
 * @typedef {import('vitest').Mock} Mock
 */

/**
 * Helper to cast oracledb to a mockable object while maintaining types
 * @typedef {object} OracledbMock
 * @property {Mock} createPool
 */

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
			const mockConnection = /** @type {Connection & {release: Mock}} */ ({
				release: vi.fn().mockResolvedValue(undefined),
			});
			const mockPool = /** @type {Pool & {getConnection: Mock}} */ ({
				getConnection: vi.fn().mockResolvedValue(mockConnection),
			});

			const result = await connectionValid(mockPool);
			expect(result).toBe(true);
			expect(mockPool.getConnection).toHaveBeenCalled();
			expect(mockConnection.release).toHaveBeenCalled();
		});

		it('should return false when connection fails', async () => {
			const mockPool = /** @type {Pool & {getConnection: Mock}} */ ({
				getConnection: vi.fn().mockRejectedValue(new Error('Connection failed')),
			});

			const result = await connectionValid(mockPool);
			expect(result).toBe(false);
		});
	});

	describe('poolCreate', () => {
		it('should create and validate a pool successfully', async () => {
			const mockConnection = /** @type {Connection & {release: Mock}} */ ({
				release: vi.fn().mockResolvedValue(undefined),
			});
			const mockPool = /** @type {Pool & {getConnection: Mock, close: Mock}} */ ({
				getConnection: vi.fn().mockResolvedValue(mockConnection),
				close: vi.fn(),
			});

			const oracledbMock = /** @type {OracledbMock} */ (/** @type {unknown} */ (oracledb));
			oracledbMock.createPool.mockResolvedValue(mockPool);

			const pool = await poolCreate('user', 'pass', 'xe');
			expect(pool).toBe(mockPool);
			expect(oracledbMock.createPool).toHaveBeenCalled();
		});

		it('should throw error and close pool if validation fails', async () => {
			const mockPool = /** @type {Pool & {getConnection: Mock, close: Mock}} */ ({
				getConnection: vi.fn().mockRejectedValue(new Error('Invalid')),
				close: vi.fn().mockResolvedValue(undefined),
			});

			const oracledbMock = /** @type {OracledbMock} */ (/** @type {unknown} */ (oracledb));
			oracledbMock.createPool.mockResolvedValue(mockPool);

			await expect(poolCreate('user', 'pass', 'xe')).rejects.toThrow('Unable to connect');
			expect(mockPool.close).toHaveBeenCalledWith(0);
		});
	});

	describe('poolClose', () => {
		it('should close the pool with 0 timeout', async () => {
			const mockPool = /** @type {Pool & {close: Mock}} */ ({
				close: vi.fn().mockResolvedValue(undefined),
			});
			await poolClose(mockPool);
			expect(mockPool.close).toHaveBeenCalledWith(0);
		});

		it('should handle errors during pool close', async () => {
			const mockPool = /** @type {Pool & {close: Mock}} */ ({
				close: vi.fn().mockRejectedValue(new Error('Close failed')),
			});
			// poolClose swallows the error internally as per implementation
			await expect(poolClose(mockPool)).resolves.toBeUndefined();
		});
	});

	describe('poolsClose', () => {
		it('should close multiple pools', async () => {
			const mockPool1 = /** @type {Pool & {close: Mock}} */ ({
				close: vi.fn().mockResolvedValue(undefined),
			});
			const mockPool2 = /** @type {Pool & {close: Mock}} */ ({
				close: vi.fn().mockResolvedValue(undefined),
			});
			await poolsClose([mockPool1, mockPool2]);
			expect(mockPool1.close).toHaveBeenCalled();
			expect(mockPool2.close).toHaveBeenCalled();
		});
	});
});
