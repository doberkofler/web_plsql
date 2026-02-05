import assert from 'node:assert';
import {describe, it} from 'vitest';
import oracledb from 'oracledb';
import {getProcedureVariable} from '../src/handler/plsql/procedureVariable.js';

describe('handler/plsql/procedureVariable', () => {
	it('should process simple string arguments', () => {
		const argObj = {p1: 'v1', p2: 'v2'};
		/** @type {any} */
		const req = {};

		const result = getProcedureVariable(req, 'my_proc', argObj);

		assert.strictEqual(result.sql, 'my_proc(:argnames, :argvalues)');
		assert.strictEqual(result.bind.argnames.type, oracledb.STRING);
		assert.deepStrictEqual(result.bind.argnames.val, ['p1', 'p2']);
		assert.deepStrictEqual(result.bind.argvalues.val, ['v1', 'v2']);
	});

	it('should process array arguments', () => {
		const argObj = {p1: ['v1a', 'v1b']};
		/** @type {any} */
		const req = {};

		const result = getProcedureVariable(req, 'my_proc', argObj);

		assert.strictEqual(result.sql, 'my_proc(:argnames, :argvalues)');
		assert.deepStrictEqual(result.bind.argnames.val, ['p1', 'p1']);
		assert.deepStrictEqual(result.bind.argvalues.val, ['v1a', 'v1b']);
	});

	it('should process mixed arguments', () => {
		const argObj = {p1: 'v1', p2: ['v2a', 'v2b']};
		/** @type {any} */
		const req = {};

		const result = getProcedureVariable(req, 'my_proc', argObj);

		assert.deepStrictEqual(result.bind.argnames.val, ['p1', 'p2', 'p2']);
		assert.deepStrictEqual(result.bind.argvalues.val, ['v1', 'v2a', 'v2b']);
	});
});
