import {describe, it, expect, vi, beforeEach} from 'vitest';
import mockOracledb, {createPool, setExecuteCallback} from './oracledb-mock.js';
import type {DbType} from 'oracledb';

describe('oracledb-mock', () => {
	beforeEach(() => {
		setExecuteCallback(null);
	});

	it('should create a pool', async () => {
		const pool = (await createPool({})) as any;
		expect(pool).toBeDefined();
		expect(pool.connectionsOpen).toBe(0);
		expect(pool.connectionsInUse).toBe(0);
	});

	it('should get a connection from the pool', async () => {
		const pool = (await createPool({})) as any;
		const connection = await pool.getConnection();
		expect(connection).toBeDefined();
		expect(pool.connectionsInUse).toBe(1);
		expect(pool.connectionsOpen).toBe(1);

		// Get another connection
		await pool.getConnection();
		expect(pool.connectionsInUse).toBe(2);
		expect(pool.connectionsOpen).toBe(2);
	});

	it('should close the pool', async () => {
		const pool = (await createPool({})) as any;
		await pool.getConnection();
		await pool.close();
		expect(pool.connectionsInUse).toBe(0);
		expect(pool.connectionsOpen).toBe(0);
	});

	it('should execute a query without callback', async () => {
		const pool = (await createPool({})) as any;
		const connection = await pool.getConnection();
		const result = await connection.execute('SELECT 1 FROM DUAL');
		expect(result).toEqual({rows: []});
	});

	it('should execute a query with callback', async () => {
		const mockCallback = vi.fn().mockResolvedValue({rows: ['test']});
		setExecuteCallback(mockCallback);

		const pool = (await createPool({})) as any;
		const connection = await pool.getConnection();
		const result = await connection.execute('SELECT 1 FROM DUAL', {param: 1});

		expect(mockCallback).toHaveBeenCalledWith('SELECT 1 FROM DUAL', {param: 1});
		expect(result).toEqual({rows: ['test']});
	});

	it('should create a LOB', async () => {
		const pool = (await createPool({})) as any;
		const connection = await pool.getConnection();
		const lob = await connection.createLob(2017 as unknown as DbType); // CLOB type
		expect(lob).toBeDefined();
		expect(lob.type).toBe(2017);

		// Test destroy
		lob.destroy();
	});

	it('should handle commit', async () => {
		const pool = (await createPool({})) as any;
		const connection = await pool.getConnection();
		await expect(connection.commit()).resolves.toBeUndefined();
	});

	it('should handle rollback', async () => {
		const pool = (await createPool({})) as any;
		const connection = await pool.getConnection();
		await expect(connection.rollback()).resolves.toBeUndefined();
	});

	it('should handle release', async () => {
		const pool = (await createPool({})) as any;
		const connection = await pool.getConnection();
		await expect(connection.release()).resolves.toBeUndefined();
	});

	it('should export default object', () => {
		expect(mockOracledb).toBeDefined();
		expect(mockOracledb.createPool).toBeDefined();
		expect(mockOracledb.setExecuteCallback).toBeDefined();
	});
});
