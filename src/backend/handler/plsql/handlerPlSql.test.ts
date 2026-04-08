import {describe, it, expect, vi} from 'vitest';
import {handlerWebPlSql} from '../../handler/plsql/handlerPlSql.ts';
import {errorPage} from '../../handler/plsql/errorPage.ts';
import {processRequest} from '../../handler/plsql/request.ts';

vi.mock('../../handler/plsql/errorPage.ts', () => ({
	errorPage: vi.fn<(...args: unknown[]) => unknown>(),
}));

vi.mock('../../handler/plsql/request.ts', () => ({
	processRequest: vi.fn<(...args: unknown[]) => unknown>(),
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
	it('should call errorPage if no procedure name and no default page', async () => {
		const pool = {} as any;
		const config = {
			route: '/pls',
			user: 'scott',
			password: 'tiger',
			connectString: 'xe',
			defaultPage: '', // Empty default page
			documentTable: 'docs',
			errorStyle: 'basic',
		} as any;

		const handler = handlerWebPlSql(pool, config);
		const req = {
			params: {}, // No name
			originalUrl: '/pls',
		} as any;
		const res = {
			redirect: vi.fn<(...args: unknown[]) => unknown>(),
		} as any;
		const next = vi.fn<(...args: unknown[]) => unknown>();

		handler(req, res, next);

		// Small delay for async handler call
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(errorPage).toHaveBeenCalledWith(req, res, config, expect.any(Object));
		// Verify the error message
		const errorArg = (errorPage as any).mock.calls[0][3];
		expect(errorArg.message).toContain('No procedure name given');
	});

	it('should handle successful authentication', async () => {
		const pool = {} as any;
		const authCallback = vi.fn<(...args: unknown[]) => unknown>().mockResolvedValue('AUTH_USER');
		const config = {
			route: '/pls',
			user: 'scott',
			password: 'tiger',
			connectString: 'xe',
			defaultPage: 'index',
			documentTable: 'docs',
			errorStyle: 'basic',
			auth: {
				type: 'basic',
				callback: authCallback,
			},
		} as any;

		const handler = handlerWebPlSql(pool, config);
		const req = {
			params: {name: 'proc'},
			headers: {authorization: 'Basic ' + Buffer.from('user:pass').toString('base64')},
			originalUrl: '/pls/proc',
		} as any;
		const res = {
			set: vi.fn<(...args: unknown[]) => unknown>(),
			status: vi.fn<(...args: unknown[]) => unknown>().mockReturnThis(),
			send: vi.fn<(...args: unknown[]) => unknown>(),
		} as any;
		const next = vi.fn<(...args: unknown[]) => unknown>();

		handler(req, res, next);
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(authCallback).toHaveBeenCalledWith({username: 'user', password: 'pass'}, pool);
		expect(processRequest).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			expect.anything(),
			expect.anything(),
			expect.anything(),
			expect.anything(),
			'AUTH_USER',
		);
	});

	it('should return 401 on failed authentication', async () => {
		const pool = {} as any;
		const authCallback = vi.fn<(...args: unknown[]) => unknown>().mockResolvedValue(null);
		const config = {
			route: '/pls',
			user: 'scott',
			password: 'tiger',
			connectString: 'xe',
			defaultPage: 'index',
			documentTable: 'docs',
			errorStyle: 'basic',
			auth: {
				type: 'basic',
				callback: authCallback,
				realm: 'Test Realm',
			},
		} as any;

		const handler = handlerWebPlSql(pool, config);
		const req = {
			params: {name: 'proc'},
			headers: {authorization: 'Basic ' + Buffer.from('user:wrong').toString('base64')},
		} as any;
		const res = {
			set: vi.fn<(...args: unknown[]) => unknown>(),
			status: vi.fn<(...args: unknown[]) => unknown>().mockReturnThis(),
			send: vi.fn<(...args: unknown[]) => unknown>(),
		} as any;
		const next = vi.fn<(...args: unknown[]) => unknown>();

		handler(req, res, next);
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(res.set).toHaveBeenCalledWith('WWW-Authenticate', 'Basic realm="Test Realm"');
		expect(res.status).toHaveBeenCalledWith(401);
		expect(processRequest).not.toHaveBeenCalled();
	});

	it('should handle successful custom authentication', async () => {
		const pool = {} as any;
		const authCallback = vi.fn<(...args: unknown[]) => unknown>().mockResolvedValue('CUSTOM_USER');
		const config = {
			route: '/pls',
			user: 'scott',
			password: 'tiger',
			connectString: 'xe',
			defaultPage: 'index',
			documentTable: 'docs',
			errorStyle: 'basic',
			auth: {
				type: 'custom',
				callback: authCallback,
			},
		} as any;

		const handler = handlerWebPlSql(pool, config);
		const req = {
			params: {name: 'proc'},
			headers: {authorization: 'Bearer token'},
			originalUrl: '/pls/proc',
		} as any;
		const res = {
			set: vi.fn<(...args: unknown[]) => unknown>(),
			status: vi.fn<(...args: unknown[]) => unknown>().mockReturnThis(),
			send: vi.fn<(...args: unknown[]) => unknown>(),
		} as any;
		const next = vi.fn<(...args: unknown[]) => unknown>();

		handler(req, res, next);
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(authCallback).toHaveBeenCalledWith(req, pool);
		expect(processRequest).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			expect.anything(),
			expect.anything(),
			expect.anything(),
			expect.anything(),
			'CUSTOM_USER',
		);
	});

	it('should return 401 on failed custom authentication', async () => {
		const pool = {} as any;
		const authCallback = vi.fn<(...args: unknown[]) => unknown>().mockResolvedValue(null);
		const config = {
			route: '/pls',
			user: 'scott',
			password: 'tiger',
			connectString: 'xe',
			defaultPage: 'index',
			documentTable: 'docs',
			errorStyle: 'basic',
			auth: {
				type: 'custom',
				callback: authCallback,
			},
		} as any;

		const handler = handlerWebPlSql(pool, config);
		const req = {
			params: {name: 'proc'},
			headers: {authorization: 'Bearer invalid'},
		} as any;
		const res = {
			set: vi.fn<(...args: unknown[]) => unknown>(),
			status: vi.fn<(...args: unknown[]) => unknown>().mockReturnThis(),
			send: vi.fn<(...args: unknown[]) => unknown>(),
		} as any;
		const next = vi.fn<(...args: unknown[]) => unknown>();

		handler(req, res, next);
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(res.status).toHaveBeenCalledWith(401);
		expect(processRequest).not.toHaveBeenCalled();
	});
});