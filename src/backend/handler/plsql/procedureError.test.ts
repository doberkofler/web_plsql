import assert from 'node:assert';
import {describe, it} from 'vitest';
import {ProcedureError} from '../../handler/plsql/procedureError.ts';

describe('ProcedureError', () => {
	it('should create a ProcedureError with details', () => {
		const message = 'Procedure failed';
		const environment = {some: 'env'};
		const sql = 'SELECT * FROM dual';

		const bind = {p1: 'val'} as any;

		const error = new ProcedureError(message, environment, sql, bind);

		assert.ok(error instanceof ProcedureError);
		assert.ok(error instanceof Error);
		assert.strictEqual(error.message, message);
		assert.strictEqual(error.environment, environment);
		assert.strictEqual(error.sql, sql);
		assert.strictEqual(error.bind, bind);
		assert.ok(error.timestamp instanceof Date);
		assert.ok(error.stack);
	});
});
