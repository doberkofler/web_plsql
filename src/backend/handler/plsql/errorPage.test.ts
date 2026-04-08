import assert from 'node:assert';
import {describe, it, vi, afterEach} from 'vitest';
import {errorPage} from '../../handler/plsql/errorPage.ts';
import {ProcedureError} from '../../handler/plsql/procedureError.ts';
import {RequestError} from '../../handler/plsql/requestError.ts';
import type {configPlSqlHandlerType} from '../../types.ts';

// Mock trace.js
vi.mock('../../util/trace.ts', () => {
	return {
		getFormattedMessage: vi.fn<(...args: unknown[]) => unknown>((data: any) => ({
			html: `<div>${data.message}</div>`,
			text: data.message,
		})),
		logToFile: vi.fn<(...args: unknown[]) => unknown>(),

		inspect: vi.fn<(...args: unknown[]) => unknown>((v: any) => JSON.stringify(v)),
	};
});

// Mock console.error
vi.spyOn(console, 'error').mockImplementation(() => {
	// Mock implementation
});

describe('handler/plsql/errorPage', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should send basic 404 page when errorStyle is basic', () => {
		const req = {
			get: vi.fn<(...args: unknown[]) => unknown>(),
		} as any;

		const res = {
			status: vi.fn<(...args: unknown[]) => unknown>().mockReturnThis(),
			send: vi.fn<(...args: unknown[]) => unknown>(),
		} as any;
		const options = {errorStyle: 'basic'} as configPlSqlHandlerType;
		const error = new Error('Some error');

		errorPage(req, res, options, error);

		assert.strictEqual(res.status.mock.calls[0]?.[0], 404);

		assert.strictEqual(res.send.mock.calls[0]?.[0], 'Page not found');
	});

	it('should send detailed html page when errorStyle is debug', () => {
		const req = {
			get: vi.fn<(...args: unknown[]) => unknown>(),
		} as any;

		const res = {
			status: vi.fn<(...args: unknown[]) => unknown>().mockReturnThis(),
			send: vi.fn<(...args: unknown[]) => unknown>(),
		} as any;
		const options = {errorStyle: 'debug'} as configPlSqlHandlerType;
		const error = new Error('Some error');

		errorPage(req, res, options, error);

		assert.strictEqual(res.status.mock.calls[0]?.[0], 404);

		assert.ok(res.send.mock.calls[0]?.[0]?.includes('Some error'));
	});

	it('should handle ProcedureError correctly', () => {
		const req = {
			get: vi.fn<(...args: unknown[]) => unknown>(),
		} as any;

		const res = {
			status: vi.fn<(...args: unknown[]) => unknown>().mockReturnThis(),
			send: vi.fn<(...args: unknown[]) => unknown>(),
		} as any;
		const options = {errorStyle: 'debug'} as configPlSqlHandlerType;
		const error = new ProcedureError('Proc Error', {}, 'SELECT', {});

		errorPage(req, res, options, error);

		assert.strictEqual(res.status.mock.calls.length, 1);
	});

	it('should handle RequestError correctly', () => {
		const req = {
			get: vi.fn<(...args: unknown[]) => unknown>(),
		} as any;

		const res = {
			status: vi.fn<(...args: unknown[]) => unknown>().mockReturnThis(),
			send: vi.fn<(...args: unknown[]) => unknown>(),
		} as any;
		const options = {errorStyle: 'debug'} as configPlSqlHandlerType;
		const error = new RequestError('Req Error');

		errorPage(req, res, options, error);

		assert.strictEqual(res.status.mock.calls.length, 1);
	});

	it('should handle string error correctly', () => {
		const req = {
			get: vi.fn<(...args: unknown[]) => unknown>(),
		} as any;

		const res = {
			status: vi.fn<(...args: unknown[]) => unknown>().mockReturnThis(),
			send: vi.fn<(...args: unknown[]) => unknown>(),
		} as any;
		const options = {errorStyle: 'debug'} as configPlSqlHandlerType;
		const error = 'String Error';

		errorPage(req, res, options, error);

		assert.strictEqual(res.status.mock.calls.length, 1);
	});

	it('should not send response if headers are already sent', () => {
		const req = {
			get: vi.fn<(...args: unknown[]) => unknown>(),
		} as any;

		const res = {
			status: vi.fn<(...args: unknown[]) => unknown>().mockReturnThis(),
			send: vi.fn<(...args: unknown[]) => unknown>(),
			headersSent: true,
		} as any;
		const options = {errorStyle: 'debug'} as configPlSqlHandlerType;
		const error = new Error('Some error');

		errorPage(req, res, options, error);

		assert.strictEqual(res.status.mock.calls.length, 0);
		assert.strictEqual(res.send.mock.calls.length, 0);
	});
});