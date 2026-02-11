import {describe, it, expect, beforeEach, vi} from 'vitest';
import {MockPool, MockConnection, MockLob, setExecuteCallback, CONSTANTS, type executeCallbackType} from '../../../src/backend/util/db-mock.ts';
import type {IDbResult, IDbBindParameterConfig} from '../../../src/backend/util/db-types.ts';

describe('util/db-mock (Standalone)', () => {
	let pool: MockPool;

	beforeEach(() => {
		setExecuteCallback(null);
		pool = new MockPool();
	});

	describe('MockPool', () => {
		it('should create a new pool instance', () => {
			const p = new MockPool();
			expect(p).toBeDefined();
			expect(p.connectionsOpen).toBe(0);
			expect(p.connectionsInUse).toBe(0);
		});

		it('should track connections open and use', async () => {
			await pool.getConnection();
			expect(pool.connectionsInUse).toBe(1);
			expect(pool.connectionsOpen).toBe(1);

			await pool.getConnection();
			expect(pool.connectionsInUse).toBe(2);
			expect(pool.connectionsOpen).toBe(2);
		});

		it('should decrement connectionsInUse on release', async () => {
			const conn = await pool.getConnection();
			expect(pool.connectionsInUse).toBe(1);
			await conn.release();
			expect(pool.connectionsInUse).toBe(0);
		});

		it('should reset counters on close', async () => {
			await pool.getConnection();
			await pool.getConnection();
			expect(pool.connectionsOpen).toBe(2);
			expect(pool.connectionsInUse).toBe(2);

			await pool.close(0);
			expect(pool.connectionsOpen).toBe(0);
			expect(pool.connectionsInUse).toBe(0);
		});
	});

	describe('MockConnection', () => {
		let connection: MockConnection;

		beforeEach(async () => {
			connection = (await pool.getConnection()) as MockConnection;
		});

		it('should be created with a reference to the pool', () => {
			expect(connection).toBeDefined();
		});

		it('execute should return default empty rows without callback', async () => {
			const result = await connection.execute('SELECT * FROM dual');
			expect(result).toEqual({rows: []});
		});

		it('execute should call the callback when set', async () => {
			const expectedResult = {rows: [{id: 1}], metaData: [{name: 'ID'}]} as IDbResult;
			const customCallback: executeCallbackType = (_sql: string) => expectedResult;
			setExecuteCallback(customCallback);

			const result = await connection.execute('SELECT * FROM test');
			expect(result).toEqual(expectedResult);
		});

		it('execute should pass bind parameters to callback', async () => {
			const bindParams = {id: 1, name: 'test'} as IDbBindParameterConfig;
			let capturedBinds: IDbBindParameterConfig | undefined;
			setExecuteCallback((_sql: string, binds?: IDbBindParameterConfig) => {
				capturedBinds = binds;
				return {rows: []} as IDbResult;
			});

			await connection.execute('SELECT * FROM test WHERE id = :id AND name = :name', bindParams);
			expect(capturedBinds).toEqual(bindParams);
		});

		it('createLob should return MockLob instance', async () => {
			const lob = (await connection.createLob(CONSTANTS.BLOB)) as MockLob;
			expect(lob).toBeInstanceOf(MockLob);
			expect(lob.type).toBe(CONSTANTS.BLOB);
		});

		it('createLob should work for CLOB type', async () => {
			const lob = (await connection.createLob(CONSTANTS.CLOB)) as MockLob;
			expect(lob).toBeInstanceOf(MockLob);
			expect(lob.type).toBe(CONSTANTS.CLOB);
		});

		it('commit should resolve', async () => {
			await expect(connection.commit()).resolves.toBeUndefined();
		});

		it('rollback should resolve', async () => {
			await expect(connection.rollback()).resolves.toBeUndefined();
		});

		it('release should return connection to pool', async () => {
			expect(pool.connectionsInUse).toBe(1);
			await connection.release();
			expect(pool.connectionsInUse).toBe(0);
		});
	});

	describe('MockLob', () => {
		it('should store the LOB type', () => {
			const blob = new MockLob(CONSTANTS.BLOB);
			expect(blob.type).toBe(CONSTANTS.BLOB);
		});

		it('destroy should not throw', () => {
			const lob = new MockLob(CONSTANTS.CLOB);
			expect(() => lob.destroy()).not.toThrow();
		});
	});

	describe('setExecuteCallback', () => {
		it('should set and clear the callback', async () => {
			const connection = (await pool.getConnection()) as MockConnection;

			const customCallback: executeCallbackType = vi.fn().mockReturnValue({rows: [{value: 1}]} as IDbResult);
			setExecuteCallback(customCallback);

			const result = await connection.execute('TEST');
			expect(result).toEqual({rows: [{value: 1}]});
			expect(customCallback).toHaveBeenCalledWith('TEST', undefined);

			setExecuteCallback(null);
			const defaultResult = await connection.execute('TEST');
			expect(defaultResult).toEqual({rows: []});
		});

		it('should support async callbacks', async () => {
			setExecuteCallback(async (_sql: string) => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return {rows: [{sql: 'ASYNC_SQL'}]} as IDbResult;
			});

			const connection = (await pool.getConnection()) as MockConnection;
			const result = await connection.execute('ASYNC_SQL');
			expect(result).toEqual({rows: [{sql: 'ASYNC_SQL'}]});
		});
	});

	describe('CONSTANTS', () => {
		it('should have correct bind direction values', () => {
			expect(CONSTANTS.BIND_IN).toBe(3001);
			expect(CONSTANTS.BIND_INOUT).toBe(3002);
			expect(CONSTANTS.BIND_OUT).toBe(3003);
		});

		it('should have correct DB type values', () => {
			expect(CONSTANTS.STRING).toBe(2001);
			expect(CONSTANTS.NUMBER).toBe(2002);
			expect(CONSTANTS.DATE).toBe(2003);
			expect(CONSTANTS.CURSOR).toBe(2004);
			expect(CONSTANTS.BUFFER).toBe(2005);
			expect(CONSTANTS.CLOB).toBe(2006);
			expect(CONSTANTS.BLOB).toBe(2007);
		});

		it('should have DB_TYPE_VARCHAR mapped to STRING', () => {
			expect(CONSTANTS.DB_TYPE_VARCHAR).toBe(CONSTANTS.STRING);
		});

		it('should have DB_TYPE_CLOB mapped to CLOB', () => {
			expect(CONSTANTS.DB_TYPE_CLOB).toBe(CONSTANTS.CLOB);
		});

		it('should have DB_TYPE_NUMBER mapped to NUMBER', () => {
			expect(CONSTANTS.DB_TYPE_NUMBER).toBe(CONSTANTS.NUMBER);
		});

		it('should have DB_TYPE_DATE mapped to DATE', () => {
			expect(CONSTANTS.DB_TYPE_DATE).toBe(CONSTANTS.DATE);
		});
	});

	describe('createPool (mock factory)', () => {
		it('should create a MockPool instance', async () => {
			const {createPool} = await import('../../../src/backend/util/db-mock.ts');
			const pool = await createPool({user: 'test', password: 'test'});
			expect(pool).toBeInstanceOf(MockPool);
		});
	});
});
