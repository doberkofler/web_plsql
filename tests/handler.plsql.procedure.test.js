import {describe, it, expect, vi, beforeEach} from 'vitest';
import oracledb from 'oracledb';
import {Readable} from 'node:stream';
import {invokeProcedure} from '../src/handler/plsql/procedure.js';
import {ProcedureError} from '../src/handler/plsql/procedureError.js';
import {traceManager} from '../src/util/traceManager.js';
import {uploadFile} from '../src/handler/plsql/upload.js';
import {OWAPageStream} from '../src/handler/plsql/owaPageStream.js';

/**
 * @typedef {import('vitest').Mock} Mock
 * @typedef {import('oracledb').Connection} Connection
 * @typedef {import('../src/util/cache.js').Cache<any>} GenericCache
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 */

vi.mock('../src/handler/plsql/upload.js', () => ({
	uploadFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/handler/plsql/procedureSanitize.js', () => ({
	sanitizeProcName: vi.fn((name) => Promise.resolve(name)),
}));

vi.mock('../src/handler/plsql/procedureNamed.js', () => ({
	getProcedureNamed: vi.fn((_req, name) => Promise.resolve({sql: `${name}()`, bind: {}})),
}));

vi.mock('../src/handler/plsql/parsePage.js', () => ({
	parsePage: vi.fn(() => ({
		head: {cookies: [], otherHeaders: {}},
		body: '<html></html>',
		file: {fileType: '', fileSize: 0, fileBlob: null},
	})),
}));

vi.mock('../src/handler/plsql/sendResponse.js', () => ({
	sendResponse: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/handler/plsql/owaPageStream.js', () => {
	return {
		OWAPageStream: vi.fn(),
	};
});

describe('handler/plsql/procedure', () => {
	/** @type {GenericCache} */
	let mockNameCache;
	/** @type {GenericCache} */
	let mockArgCache;
	/** @type {Connection & {execute: Mock, createLob: Mock}} */
	let mockConn;

	/** @type {Mock} */
	let mockDeleteName;
	/** @type {Mock} */
	let mockDeleteArg;

	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteName = vi.fn();
		mockDeleteArg = vi.fn();
		mockNameCache = /** @type {GenericCache} */ (
			/** @type {unknown} */ ({
				delete: mockDeleteName,
			})
		);
		mockArgCache = /** @type {GenericCache} */ (
			/** @type {unknown} */ ({
				delete: mockDeleteArg,
			})
		);
		mockConn = /** @type {Connection & {execute: Mock, createLob: Mock}} */ (
			/** @type {unknown} */ ({
				execute: vi.fn().mockImplementation((sql) => {
					if (sql.includes('owa.get_page')) {
						return Promise.resolve({outBinds: {lines: [], irows: 0}});
					}
					if (sql.includes('wpg_docload.is_file_download()')) {
						return Promise.resolve({outBinds: {fileType: '', fileSize: 0, fileBlob: null}});
					}
					return Promise.resolve({outBinds: {}});
				}),
				createLob: vi.fn().mockResolvedValue({destroy: vi.fn()}),
			})
		);

		// Default mock for OWAPageStream
		vi.mocked(OWAPageStream).mockImplementation(function () {
			const s = new Readable({
				read() {
					/* mock */
					this.push(null);
				},
			});
			// @ts-expect-error - mock fetchChunk implementation for test coverage
			s.fetchChunk = vi.fn().mockResolvedValue(['<html></html>']);
			// @ts-expect-error - mock addBody implementation for test coverage
			s.addBody = vi.fn();
			return /** @type {any} */ (s);
		});
	});

	it('should invalidate caches on ORA-04068 error', async () => {
		const req = /** @type {Request} */ (
			/** @type {unknown} */ ({
				params: {name: 'my_proc'},
			})
		);
		const res = /** @type {Response} */ (/** @type {unknown} */ ({}));
		const options = /** @type {import('../src/types.js').configPlSqlHandlerType} */ ({
			defaultPage: 'home',
			documentTable: 'docs',
			errorStyle: 'basic',
		});

		// Simulate ORA-04068 during procedure execution
		mockConn.execute.mockImplementation((sql) => {
			if (sql.includes('BEGIN my_proc(); END;')) {
				throw new ProcedureError('ORA-04068: existing state of packages has been discarded', {}, 'my_proc', {});
			}
			if (sql.includes('wpg_docload.is_file_download()')) {
				return Promise.resolve({outBinds: {fileType: '', fileSize: 0, fileBlob: null}});
			}
			if (sql.includes('owa.get_page')) {
				return Promise.resolve({outBinds: {lines: [], irows: 0}});
			}
			return Promise.resolve({outBinds: {}});
		});

		await expect(invokeProcedure(req, res, {}, {}, [], options, mockConn, mockNameCache, mockArgCache)).rejects.toThrow('ORA-04068');

		expect(mockDeleteName).toHaveBeenCalledWith('my_proc');
		expect(mockDeleteArg).toHaveBeenCalledWith('MY_PROC');
	});

	it('should handle file downloads from procedure', async () => {
		const req = /** @type {Request} */ (
			/** @type {unknown} */ ({
				params: {name: 'download_proc'},
			})
		);
		const res = /** @type {Response} */ (/** @type {unknown} */ ({}));
		const options = /** @type {import('../src/types.js').configPlSqlHandlerType} */ ({
			defaultPage: 'home',
			documentTable: 'docs',
			errorStyle: 'basic',
		});

		const mockLob = {destroy: vi.fn()};
		mockConn.createLob.mockResolvedValue(mockLob);

		// Mock execute for procedureDownloadFiles
		mockConn.execute.mockImplementation((sql) => {
			if (sql.includes('wpg_docload.is_file_download()')) {
				return Promise.resolve({
					outBinds: {
						fileType: 'B',
						fileSize: 100,
						fileBlob: new Readable({
							read() {
								/* mock */
								this.push(null);
							},
						}), // Actual Readable instance
					},
				});
			}
			if (sql.includes('owa.get_page')) {
				return Promise.resolve({outBinds: {lines: ['abc'], irows: 1}});
			}
			return Promise.resolve({outBinds: {}});
		});

		await invokeProcedure(req, res, {}, {}, [], options, mockConn, mockNameCache, mockArgCache);

		expect(mockConn.createLob).toHaveBeenCalledWith(oracledb.BLOB);
		expect(mockLob.destroy).toHaveBeenCalled();
	});

	it('should warn and skip upload if documentTable is missing', async () => {
		const req = /** @type {Request} */ (
			/** @type {unknown} */ ({
				params: {name: 'upload_proc'},
			})
		);
		const res = /** @type {Response} */ (/** @type {unknown} */ ({}));
		const options = /** @type {import('../src/types.js').configPlSqlHandlerType} */ ({
			defaultPage: 'home',
			documentTable: '',
			errorStyle: 'basic',
		});

		const consoleSpy = vi.spyOn(console, 'warn');

		/** @type {import('../src/types.js').fileUploadType} */
		const file = {
			fieldname: 'f1',
			originalname: 'o1',
			encoding: '7bit',
			mimetype: 'text/plain',
			filename: 'f1',
			path: '/tmp/f1',
			size: 10,
		};

		await invokeProcedure(req, res, {}, {}, [file], options, mockConn, mockNameCache, mockArgCache);

		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('doctable" has not been defined'));
	});

	it('should add trace entries when tracing is enabled', async () => {
		vi.spyOn(traceManager, 'isEnabled').mockReturnValue(true);
		const traceSpy = vi.spyOn(traceManager, 'addTrace').mockImplementation(() => {
			/* mock */
		});

		const req = /** @type {Request} */ (
			/** @type {unknown} */ ({
				params: {name: 'trace_proc'},
				originalUrl: '/plsql/trace_proc',
				method: 'GET',
				headers: {test: 'header'},
				cookies: {test: 'cookie'},
			})
		);
		const res = /** @type {Response} */ (/** @type {unknown} */ ({}));
		const options = /** @type {import('../src/types.js').configPlSqlHandlerType} */ ({
			defaultPage: 'home',
			documentTable: 'docs',
		});

		mockConn.execute.mockImplementation((sql) => {
			if (sql.includes('wpg_docload.is_file_download()')) {
				return Promise.resolve({
					outBinds: {
						fileType: 'B',
						fileSize: 50,
						fileBlob: new Readable({
							read() {
								this.push(null);
							},
						}),
					},
				});
			}
			if (sql.includes('owa.get_page')) {
				return Promise.resolve({outBinds: {lines: [], irows: 0}});
			}
			return Promise.resolve({outBinds: {}});
		});

		await invokeProcedure(req, res, {}, {REMOTE_ADDR: '127.0.0.1'}, [], options, mockConn, mockNameCache, mockArgCache);

		expect(traceSpy).toHaveBeenCalled();
		// @ts-expect-error - mock.calls[0] is defined because toHaveBeenCalled passed
		const traceEntry = /** @type {import('../src/admin/js/types.js').TraceEntry} */ (traceSpy.mock.calls[0][0]);
		expect(traceEntry.status).toBe('success');
		expect(traceEntry.procedure).toBe('trace_proc');
		expect(traceEntry.headers).toEqual({test: 'header'});
		expect(traceEntry.cookies).toEqual({test: 'cookie'});
	});

	it('should handle procedure variable arguments (prefix !)', async () => {
		const req = /** @type {Request} */ (
			/** @type {unknown} */ ({
				params: {name: '!variable_proc'},
			})
		);
		const res = /** @type {Response} */ (/** @type {unknown} */ ({}));
		const options = /** @type {import('../src/types.js').configPlSqlHandlerType} */ ({
			defaultPage: 'home',
			documentTable: 'docs',
			errorStyle: 'basic',
		});

		await invokeProcedure(req, res, {p1: 'v1'}, {}, [], options, mockConn, mockNameCache, mockArgCache);

		expect(mockConn.execute).toHaveBeenCalledWith(expect.stringContaining('variable_proc'), expect.any(Object));
	});

	it('should throw error when no procedure name is provided', async () => {
		const req = /** @type {Request} */ (
			/** @type {unknown} */ ({
				params: {},
			})
		);
		const res = /** @type {Response} */ (/** @type {unknown} */ ({}));
		const options = /** @type {import('../src/types.js').configPlSqlHandlerType} */ ({
			defaultPage: 'home',
			documentTable: 'docs',
			errorStyle: 'basic',
		});

		await expect(invokeProcedure(req, res, {}, {}, [], options, mockConn, mockNameCache, mockArgCache)).rejects.toThrow('No procedure name provided');
	});

	it('should upload files when documentTable is defined', async () => {
		const req = /** @type {Request} */ (/** @type {unknown} */ ({params: {name: 'proc'}}));
		const res = /** @type {Response} */ (/** @type {unknown} */ ({}));
		const options = /** @type {import('../src/types.js').configPlSqlHandlerType} */ ({
			defaultPage: 'home',
			documentTable: 'MY_DOCS',
		});

		/** @type {import('../src/types.js').fileUploadType} */
		const file = {fieldname: 'f', originalname: 'o', encoding: '7', mimetype: 't', filename: 'f', path: 'p', size: 1};

		await invokeProcedure(req, res, {}, {}, [file], options, mockConn, mockNameCache, mockArgCache);

		expect(uploadFile).toHaveBeenCalledWith(file, 'MY_DOCS', mockConn);
	});

	it('should handle stream errors and update trace', async () => {
		vi.spyOn(traceManager, 'isEnabled').mockReturnValue(true);
		const traceSpy = vi.spyOn(traceManager, 'addTrace');

		const req = /** @type {Request} */ (
			/** @type {unknown} */ ({
				params: {name: 'proc'},
				originalUrl: '/plsql/proc',
				method: 'GET',
				headers: {},
				cookies: {},
			})
		);
		const res = /** @type {Response} */ (/** @type {unknown} */ ({}));
		const options = /** @type {import('../src/types.js').configPlSqlHandlerType} */ ({
			defaultPage: 'home',
			documentTable: 'docs',
		});

		// Create a specific stream instance for this test
		const mockStream = new Readable({
			read() {
				// No-op for mock, data pushed manually
			},
		});
		// @ts-expect-error - mock fetchChunk implementation for test coverage
		mockStream.fetchChunk = vi.fn().mockResolvedValue(['<html></html>']);
		// @ts-expect-error - mock addBody implementation for test coverage
		mockStream.addBody = vi.fn();

		vi.mocked(OWAPageStream).mockImplementation(function () {
			return /** @type {any} */ (mockStream);
		});

		const promise = invokeProcedure(req, res, {}, {REMOTE_ADDR: '1'}, [], options, mockConn, mockNameCache, mockArgCache);

		// Wait a bit for the stream logic in invokeProcedure to setup listeners
		await new Promise((r) => setTimeout(r, 10));

		// Simulate error
		mockStream.emit('error', new Error('stream failure'));
		mockStream.push(null);

		await promise;

		// @ts-expect-error - mock calls
		const traceEntry = /** @type {any} */ (traceSpy.mock.calls.find((c) => c[0].status === 'fail')?.[0]);
		expect(traceEntry).toBeDefined();
		expect(traceEntry.error).toBe('stream failure');
	});

	it('should handle stream chunk handling and buffering', async () => {
		vi.spyOn(traceManager, 'isEnabled').mockReturnValue(true);
		const traceSpy = vi.spyOn(traceManager, 'addTrace');

		const req = /** @type {Request} */ (
			/** @type {unknown} */ ({
				params: {name: 'proc'},
				originalUrl: '/plsql/proc',
				method: 'GET',
				headers: {},
				cookies: {},
			})
		);
		const res = /** @type {Response} */ (/** @type {unknown} */ ({}));
		const options = /** @type {import('../src/types.js').configPlSqlHandlerType} */ ({
			defaultPage: 'home',
			documentTable: 'docs',
		});

		// Create a specific stream instance for this test
		const mockStream = new Readable({
			read() {
				/* mock */
			},
		});
		// @ts-expect-error - mock fetchChunk implementation for test coverage
		mockStream.fetchChunk = vi.fn().mockResolvedValue(['<html></html>']);
		// @ts-expect-error - mock addBody implementation for test coverage
		mockStream.addBody = vi.fn();

		vi.mocked(OWAPageStream).mockImplementation(function () {
			return /** @type {any} */ (mockStream);
		});

		const promise = invokeProcedure(req, res, {}, {REMOTE_ADDR: '1'}, [], options, mockConn, mockNameCache, mockArgCache);

		// Wait for stream setup
		await new Promise((r) => setTimeout(r, 10));

		// Ensure stream is flowing so 'end' event emits
		mockStream.resume();

		// Push data chunks
		mockStream.push('chunk1');
		mockStream.push('chunk2');
		mockStream.push(null);

		await promise;

		// Allow event loop to process 'end' event
		await new Promise((r) => setTimeout(r, 10));

		// @ts-expect-error - mock calls
		const traceEntry = /** @type {any} */ (traceSpy.mock.calls.find((c) => c[0].status === 'success')?.[0]);
		expect(traceEntry).toBeDefined();
		expect(traceEntry.html).toContain('chunk1chunk2');
	});

	it('should truncate large HTML response in trace', async () => {
		vi.spyOn(traceManager, 'isEnabled').mockReturnValue(true);
		const traceSpy = vi.spyOn(traceManager, 'addTrace');

		const req = /** @type {Request} */ (
			/** @type {unknown} */ ({
				params: {name: 'proc'},
				originalUrl: '/plsql/proc',
				method: 'GET',
				headers: {},
				cookies: {},
			})
		);
		const res = /** @type {Response} */ (/** @type {unknown} */ ({}));
		const options = /** @type {import('../src/types.js').configPlSqlHandlerType} */ ({});

		const mockStream = new Readable({
			read() {
				// No-op
			},
		});
		// @ts-expect-error - mock fetchChunk implementation for test coverage
		mockStream.fetchChunk = vi.fn().mockResolvedValue(['']);
		// @ts-expect-error - mock addBody implementation for test coverage
		mockStream.addBody = vi.fn();

		vi.mocked(OWAPageStream).mockImplementation(function () {
			return /** @type {any} */ (mockStream);
		});

		const promise = invokeProcedure(req, res, {}, {REMOTE_ADDR: '1'}, [], options, mockConn, mockNameCache, mockArgCache);

		await new Promise((r) => setTimeout(r, 10));
		mockStream.resume();

		const largeChunk = 'a'.repeat(1024 * 1024 + 100); // > 1MB
		mockStream.push(largeChunk);
		mockStream.push(null);

		await promise;
		await new Promise((r) => setTimeout(r, 10));

		// @ts-expect-error - mock calls
		const traceEntry = /** @type {any} */ (traceSpy.mock.calls.find((c) => c[0].status === 'success')?.[0]);
		expect(traceEntry).toBeDefined();
		expect(traceEntry.html.length).toBeLessThan(largeChunk.length);
		expect(traceEntry.html).toContain('[truncated]');
	});
});
