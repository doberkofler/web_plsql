import {describe, it, expect, vi} from 'vitest';
import {handlerWebPlSql} from '../../handler/plsql/handlerPlSql.ts';
import {errorPage} from '../../handler/plsql/errorPage.ts';

vi.mock('../../handler/plsql/errorPage.ts', () => ({
	errorPage: vi.fn(),
}));

vi.mock('../../handler/plsql/request.ts', () => ({
	processRequest: vi.fn(),
}));

// Mock Cache
vi.mock('../../util/cache.ts', () => ({
	Cache: class {
		keys() {
			return [];
		}
		getStats() {
			return {};
		}
	},
}));

describe('handler/plsql/handlerPlSql', () => {
	it('should call errorPage if no procedure name and no default page', () => {
		const pool = {} as any;
		const config = {
			defaultPage: '', // Empty default page
			documentTable: 'docs',
		} as any;

		const handler = handlerWebPlSql(pool, config);
		const req = {
			params: {}, // No name
			originalUrl: '/pls',
		} as any;
		const res = {
			redirect: vi.fn(),
		} as any;
		const next = vi.fn();

		handler(req, res, next);

		expect(errorPage).toHaveBeenCalledWith(req, res, config, expect.any(Object));
		// Verify the error message
		const errorArg = (errorPage as any).mock.calls[0][3];
		expect(errorArg.message).toContain('No procedure name given');
	});
});
