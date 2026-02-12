import assert from 'node:assert';
import {describe, it} from 'vitest';
import oracledb from 'oracledb';
import {getProcedureVariable} from '../../handler/plsql/procedureVariable.ts';
import type {Request} from 'express';

describe('handler/plsql/procedureVariable', () => {
	it('should process simple string arguments', () => {
		const argObj = {p1: 'v1', p2: 'v2'};

		const req = {} as Request;

		const result = getProcedureVariable(req, 'my_proc', argObj);

		assert.strictEqual(result.sql, 'my_proc(:argnames, :argvalues)');
		const bind = result.bind as Record<string, any>;
		assert.strictEqual(bind.argnames?.type, oracledb.STRING);
		assert.deepStrictEqual(bind.argnames?.val, ['p1', 'p2']);
		assert.deepStrictEqual(bind.argvalues?.val, ['v1', 'v2']);
	});

	it('should process array arguments', () => {
		const argObj = {p1: ['v1a', 'v1b']};

		const req = {} as Request;

		const result = getProcedureVariable(req, 'my_proc', argObj);

		assert.strictEqual(result.sql, 'my_proc(:argnames, :argvalues)');
		const bind = result.bind as Record<string, any>;
		assert.deepStrictEqual(bind.argnames?.val, ['p1', 'p1']);
		assert.deepStrictEqual(bind.argvalues?.val, ['v1a', 'v1b']);
	});

	it('should process mixed arguments', () => {
		const argObj = {p1: 'v1', p2: ['v2a', 'v2b']};

		const req = {} as Request;

		const result = getProcedureVariable(req, 'my_proc', argObj);

		const bind = result.bind as Record<string, any>;
		assert.deepStrictEqual(bind.argnames?.val, ['p1', 'p2', 'p2']);
		assert.deepStrictEqual(bind.argvalues?.val, ['v1', 'v2a', 'v2b']);
	});
});
