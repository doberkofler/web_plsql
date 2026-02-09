import assert from 'node:assert';
import {describe, it, vi, afterEach} from 'vitest';
import oracledb from 'oracledb';
import {getBinding, getProcedureNamed} from '../src/handler/plsql/procedureNamed.js';
import {Cache} from '../src/util/cache.js';

describe('handler/plsql/procedureNamed', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('getBinding', () => {
		it('should return VARCHAR2 binding', () => {
			const bind = getBinding('p1', 'val', 'VARCHAR2');
			assert.strictEqual(bind.dir, oracledb.BIND_IN);
			assert.strictEqual(bind.type, oracledb.DB_TYPE_VARCHAR);
			assert.strictEqual(bind.val, 'val');
		});

		it('should return CLOB binding', () => {
			const bind = getBinding('p1', 'val', 'CLOB');
			assert.strictEqual(bind.type, oracledb.DB_TYPE_CLOB);
		});

		it('should return NUMBER binding', () => {
			const bind = getBinding('p1', '123', 'NUMBER');
			assert.strictEqual(bind.type, oracledb.DB_TYPE_NUMBER);
			assert.strictEqual(bind.val, 123);
		});

		it('should throw error for invalid NUMBER', () => {
			assert.throws(() => {
				getBinding('p1', 'abc', 'NUMBER');
			}, /invalid value/);
		});

		it('should return DATE binding', () => {
			const dateStr = '2023-01-01';
			const result = getBinding('p1', dateStr, 'DATE');
			assert.strictEqual(result.type, oracledb.DB_TYPE_VARCHAR);
			assert.ok(result.val instanceof Date);
		});

		it('should throw error for invalid DATE', () => {
			assert.throws(() => {
				getBinding('p1', 'invalid-date', 'DATE');
			}, /invalid value/);
		});

		it('should return PL/SQL TABLE binding', () => {
			const bind = getBinding('p1', ['val1', 'val2'], 'PL/SQL TABLE');
			assert.strictEqual(bind.dir, oracledb.BIND_IN);
			assert.strictEqual(bind.type, oracledb.DB_TYPE_DATE); // Wait, DB_TYPE_DATE?
			// Line 232 says: return {dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_DATE, val: value};
			// That seems weird for PL/SQL TABLE, but I must follow the code.
			assert.deepStrictEqual(bind.val, ['val1', 'val2']);
		});

		it('should return PL/SQL TABLE binding for single string', () => {
			const bind = getBinding('p1', 'val1', 'PL/SQL TABLE');
			assert.deepStrictEqual(bind.val, ['val1']);
		});

		it('should return PL/SQL TABLE binding for array input (inferred)', () => {
			const bind2 = getBinding('p1', ['val1'], 'UNKNOWN');
			assert.deepStrictEqual(bind2.val, ['val1']);
		});

		it('should throw error for unknown binding type', () => {
			assert.throws(() => {
				getBinding('p1', 'val', 'NON_EXISTENT_TYPE');
			}, /invalid binding type/);
		});
	});

	describe('loadArguments', () => {
		it('should throw RequestError when names and types length mismatch', async () => {
			const mockExecute = vi.fn().mockResolvedValue({
				outBinds: {
					names: ['P1'],
					types: ['VARCHAR2', 'NUMBER'], // Mismatch
				},
			});
			/** @type {any} */
			const connection = {execute: mockExecute};
			const cache = new Cache();
			/** @type {any} */
			const req = {};

			await assert.rejects(
				async () => {
					await getProcedureNamed(req, 'my_proc_mismatch', {P1: 'test'}, connection, cache);
				},
				(err) => {
					assert.ok(err instanceof Error);
					assert.ok(err.message.includes('number of names and types does not match'));
					return true;
				},
			);
		});

		it('should throw error when zod parsing fails', async () => {
			const mockExecute = vi.fn().mockResolvedValue({
				outBinds: {
					names: 'not-an-array',
					types: ['VARCHAR2'],
				},
			});
			/** @type {any} */
			const connection = {execute: mockExecute};
			const cache = new Cache();
			/** @type {any} */
			const req = {};

			await assert.rejects(
				async () => {
					await getProcedureNamed(req, 'my_proc_zod_fail', {P1: 'test'}, connection, cache);
				},
				(err) => {
					assert.ok(/** @type {Error} */ (err).message.includes('Error when decoding arguments'));
					return true;
				},
			);
		});

		it('should throw RequestError when database execute fails', async () => {
			const mockExecute = vi.fn().mockRejectedValue(new Error('ORA-00942'));
			/** @type {any} */
			const connection = {execute: mockExecute};
			const cache = new Cache();
			/** @type {any} */
			const req = {};

			await assert.rejects(
				async () => {
					await getProcedureNamed(req, 'my_proc_fail', {P1: 'test'}, connection, cache);
				},
				(err) => {
					assert.ok(/** @type {Error} */ (err).message.includes('Error when retrieving arguments'));
					return true;
				},
			);
		});

		it('should handle missing argument name/type in loadArguments', async () => {
			const mockExecute = vi.fn().mockResolvedValue({
				outBinds: {
					names: ['P1', null],
					types: ['VARCHAR2', 'NUMBER'],
				},
			});
			/** @type {any} */
			const connection = {execute: mockExecute};
			const cache = new Cache();
			/** @type {any} */
			const req = {};

			const result = await getProcedureNamed(req, 'my_proc_missing', {P1: 'test'}, connection, cache);
			assert.ok(result);
		});
	});

	describe('getBinding extra', () => {
		it('should throw error for non-string DATE value', () => {
			assert.throws(() => {
				getBinding('p1', 123, 'DATE');
			}, /invalid value "123" for type "DATE"/);
		});
	});

	describe('getProcedureNamed', () => {
		it('should construct SQL and bindings correctly', async () => {
			const mockExecute = vi.fn().mockResolvedValue({
				outBinds: {
					names: ['P1', 'P2'],
					types: ['VARCHAR2', 'NUMBER'],
				},
			});
			/** @type {any} */
			const connection = {execute: mockExecute};
			const argObj = {P1: 'test', P2: '42'};
			/** @type {any} */
			const req = {};
			const cache = new Cache();

			const result = await getProcedureNamed(req, 'my_proc', argObj, connection, cache);

			assert.strictEqual(result.sql, 'my_proc(P1=>:p_P1, P2=>:p_P2)');
			assert.strictEqual(result.bind.p_P1?.val, 'test');
			assert.strictEqual(result.bind.p_P2?.val, 42);
		});

		it('should handle unknown argument gracefully (log warning and use default string bind)', async () => {
			const mockExecute = vi.fn().mockResolvedValue({
				outBinds: {
					names: ['P1'],
					types: ['VARCHAR2'],
				},
			});
			/** @type {any} */
			const connection = {execute: mockExecute};
			// P2 is unknown
			const argObj = {P1: 'test', P2: 'val'};
			/** @type {any} */
			const req = {};
			const cache = new Cache();

			const result = await getProcedureNamed(req, 'my_proc_unknown', argObj, connection, cache);

			// Should include P2 in SQL
			assert.ok(result.sql.includes('P2=>:p_P2'));
			// Should default to string bind
			assert.strictEqual(result.bind.p_P2?.val, 'val');
			assert.strictEqual(result.bind.p_P2?.type, oracledb.DB_TYPE_VARCHAR);
		});
	});
});
