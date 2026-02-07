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
			// If argType is not PL_SQL_TABLE but value is array, it enters the block?
			// 00229| if (argType === DATA_TYPES.PL_SQL_TABLE || Array.isArray(argValue)) {
			// getBinding('p1', ['val1'], 'VARCHAR2'); // passing VARCHAR2 but value is array
			// However, the first check for VARCHAR2 comes earlier:
			// 00200| if (argType === DATA_TYPES.VARCHAR2 ...
			// So if I pass VARCHAR2, it will hit line 200 first.

			// So I should pass a type that doesn't match earlier checks, or rely on array check.
			// But if I pass 'UNKNOWN', it falls through to the end?
			// No, the if block for PL_SQL_TABLE is checked.

			// Let's pass 'UNKNOWN' as type but array as value.
			const bind2 = getBinding('p1', ['val1'], 'UNKNOWN');
			assert.deepStrictEqual(bind2.val, ['val1']);
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
