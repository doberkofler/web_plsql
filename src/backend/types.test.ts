import {describe, it, expect} from 'vitest';
import {z$configPlSqlHandlerType} from './types.js';

describe('backend/types', () => {
	it('should validate valid transaction callback', () => {
		const config = {
			defaultPage: 'p',
			documentTable: 't',
			errorStyle: 'basic',
			transactionMode: (_conn: any, _proc: any) => undefined,
		};
		const result = z$configPlSqlHandlerType.safeParse(config);
		expect(result.success).toBe(true);
	});

	it('should fail invalid transaction callback', () => {
		const config = {
			defaultPage: 'p',
			documentTable: 't',
			errorStyle: 'basic',
			transactionMode: 'invalid', // not 'commit', 'rollback' or function
		};
		const result = z$configPlSqlHandlerType.safeParse(config);
		expect(result.success).toBe(false);
	});

	it('should fail non-function transaction callback', () => {
		const config = {
			defaultPage: 'p',
			documentTable: 't',
			errorStyle: 'basic',
			transactionMode: 123,
		};
		const result = z$configPlSqlHandlerType.safeParse(config);
		expect(result.success).toBe(false);
	});

	it('should validate valid auth basic callback', () => {
		const config = {
			defaultPage: 'p',
			documentTable: 't',
			errorStyle: 'basic',
			auth: {
				type: 'basic',
				callback: async () => {
					await Promise.resolve();
					return 'user';
				},
			},
		};
		const result = z$configPlSqlHandlerType.safeParse(config);
		expect(result.success).toBe(true);
	});

	it('should fail invalid auth basic callback', () => {
		const config = {
			defaultPage: 'p',
			documentTable: 't',
			errorStyle: 'basic',
			auth: {
				type: 'basic',
				callback: 'not-a-function',
			},
		};
		const result = z$configPlSqlHandlerType.safeParse(config);
		expect(result.success).toBe(false);
	});

	it('should validate valid auth custom callback', () => {
		const config = {
			defaultPage: 'p',
			documentTable: 't',
			errorStyle: 'basic',
			auth: {
				type: 'custom',
				callback: async () => {
					await Promise.resolve();
					return 'user';
				},
			},
		};
		const result = z$configPlSqlHandlerType.safeParse(config);
		expect(result.success).toBe(true);
	});

	it('should fail invalid auth custom callback', () => {
		const config = {
			defaultPage: 'p',
			documentTable: 't',
			errorStyle: 'basic',
			auth: {
				type: 'custom',
				callback: 'not-a-function',
			},
		};
		const result = z$configPlSqlHandlerType.safeParse(config);
		expect(result.success).toBe(false);
	});
});