import assert from 'node:assert';
import {describe, it, vi, afterEach} from 'vitest';
import {errorPage} from '../src/handler/plsql/errorPage.js';
import {ProcedureError} from '../src/handler/plsql/procedureError.js';
import {RequestError} from '../src/handler/plsql/requestError.js';

// Mock trace.js
vi.mock('../src/util/trace.js', () => {
	return {
		getFormattedMessage: vi.fn((data) => ({
			html: `<div>${data.message}</div>`,
			text: data.message,
		})),
		logToFile: vi.fn(),
		inspect: vi.fn((v) => JSON.stringify(v)),
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
			get: vi.fn(),
		};
		const res = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
		};
		const options = {errorStyle: 'basic'};
		const error = new Error('Some error');

		/** @type {any} */
		const anyReq = req;
		/** @type {any} */
		const anyRes = res;
		/** @type {any} */
		const anyOptions = options;

		errorPage(anyReq, anyRes, anyOptions, error);

		assert.strictEqual(res.status.mock.calls[0]?.[0], 404);
		assert.strictEqual(res.send.mock.calls[0]?.[0], 'Page not found');
	});

	it('should send detailed html page when errorStyle is debug', () => {
		const req = {
			get: vi.fn(),
		};
		const res = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
		};
		const options = {errorStyle: 'debug'};
		const error = new Error('Some error');

		/** @type {any} */
		const anyReq = req;
		/** @type {any} */
		const anyRes = res;
		/** @type {any} */
		const anyOptions = options;

		errorPage(anyReq, anyRes, anyOptions, error);

		assert.strictEqual(res.status.mock.calls[0]?.[0], 404);
		assert.ok(res.send.mock.calls[0]?.[0]?.includes('Some error'));
	});

	it('should handle ProcedureError correctly', () => {
		const req = {
			get: vi.fn(),
		};
		const res = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
		};
		const options = {errorStyle: 'debug'};
		const error = new ProcedureError('Proc Error', {}, 'SELECT', {});
		// Force stack to be present for the mock behavior verification if needed
		// But getFormattedMessage mock just uses data.message which is error.stack ?? '' in getError

		/** @type {any} */
		const anyReq = req;
		/** @type {any} */
		const anyRes = res;
		/** @type {any} */
		const anyOptions = options;

		errorPage(anyReq, anyRes, anyOptions, error);

		assert.strictEqual(res.status.mock.calls.length, 1);
	});

	it('should handle RequestError correctly', () => {
		const req = {
			get: vi.fn(),
		};
		const res = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
		};
		const options = {errorStyle: 'debug'};
		const error = new RequestError('Req Error');

		/** @type {any} */
		const anyReq = req;
		/** @type {any} */
		const anyRes = res;
		/** @type {any} */
		const anyOptions = options;

		errorPage(anyReq, anyRes, anyOptions, error);

		assert.strictEqual(res.status.mock.calls.length, 1);
	});

	it('should handle string error correctly', () => {
		const req = {
			get: vi.fn(),
		};
		const res = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
		};
		const options = {errorStyle: 'debug'};
		const error = 'String Error';

		/** @type {any} */
		const anyReq = req;
		/** @type {any} */
		const anyRes = res;
		/** @type {any} */
		const anyOptions = options;

		errorPage(anyReq, anyRes, anyOptions, error);

		assert.strictEqual(res.status.mock.calls.length, 1);
	});
});
