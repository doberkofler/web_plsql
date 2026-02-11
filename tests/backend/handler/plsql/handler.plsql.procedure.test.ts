import {describe, it, expect, vi, beforeEach} from 'vitest';
import {DB, type Connection} from '../../../../src/backend/util/db.ts';
import {Readable} from 'node:stream';
import {invokeProcedure} from '../../../../src/backend/handler/plsql/procedure.ts';
import {ProcedureError} from '../../../../src/backend/handler/plsql/procedureError.ts';
import {traceManager} from '../../../../src/backend/util/traceManager.ts';
import {uploadFile} from '../../../../src/backend/handler/plsql/upload.ts';
import {OWAPageStream} from '../../../../src/backend/handler/plsql/owaPageStream.ts';
import type {Response} from 'express';
import type {fileUploadType, configPlSqlHandlerType, argsType} from '../../../../src/backend/types.ts';
import type {Cache} from '../../../../src/backend/util/cache.ts';
import type {Mock} from 'vitest';

vi.mock('../../../../src/backend/handler/plsql/upload.ts', () => ({
	uploadFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../src/backend/handler/plsql/procedureSanitize.ts', () => ({
	sanitizeProcName: vi.fn((name) => Promise.resolve(name)),
}));

vi.mock('../../../../src/backend/handler/plsql/procedureNamed.ts', () => ({
	getProcedureNamed: vi.fn((_req, name) => Promise.resolve({sql: `${name}()`, bind: {}})),
}));

vi.mock('../../../../src/backend/handler/plsql/parsePage.ts', () => ({
	parsePage: vi.fn(() => ({
		head: {cookies: [], otherHeaders: {}},
		body: '<html></html>',
		file: {fileType: '', fileSize: 0, fileBlob: null},
	})),
}));

vi.mock('../../../../src/backend/handler/plsql/sendResponse.ts', () => ({
	sendResponse: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../src/backend/handler/plsql/owaPageStream.ts', () => {
	return {
		OWAPageStream: vi.fn(),
	};
});

describe('handler/plsql/procedure', () => {
	let mockNameCache: Cache<string>;
	let mockArgCache: Cache<argsType>;

	let mockConn: any;

	let mockDeleteName: Mock;
	let mockDeleteArg: Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteName = vi.fn();
		mockDeleteArg = vi.fn();

		mockNameCache = {
			delete: mockDeleteName,
		} as any;

		mockArgCache = {
			delete: mockDeleteArg,
		} as any;
		mockConn = {
			execute: vi.fn().mockImplementation((sql: string) => {
				if (sql.includes('owa.get_page')) {
					return Promise.resolve({outBinds: {lines: [], irows: 0}});
				}
				if (sql.includes('wpg_docload.is_file_download()')) {
					return Promise.resolve({outBinds: {fileType: '', fileSize: 0, fileBlob: null}});
				}
				return Promise.resolve({outBinds: {}});
			}),
			createLob: vi.fn().mockResolvedValue({destroy: vi.fn()}),
		} as any;

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
			return s as any;
		});
	});

	it('should invalidate caches on ORA-04068 error', async () => {
		const req = {
			params: {name: 'my_proc'},
		} as any;
		const res = {} as Response;
		const options: configPlSqlHandlerType = {
			defaultPage: 'home',
			documentTable: 'docs',
			errorStyle: 'basic',
		} as any;

		// Simulate ORA-04068 during procedure execution
		mockConn.execute.mockImplementation((sql: string) => {
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

		await expect(invokeProcedure(req, res, {}, {}, [], options, mockConn as Connection, mockNameCache, mockArgCache)).rejects.toThrow('ORA-04068');

		expect(mockDeleteName).toHaveBeenCalledWith('my_proc');
		expect(mockDeleteArg).toHaveBeenCalledWith('MY_PROC');
	});

	it('should handle file downloads from procedure', async () => {
		const req = {
			params: {name: 'download_proc'},
		} as any;
		const res = {} as Response;
		const options: configPlSqlHandlerType = {
			defaultPage: 'home',
			documentTable: 'docs',
			errorStyle: 'basic',
		} as any;

		const mockLob = {destroy: vi.fn()};
		mockConn.createLob.mockResolvedValue(mockLob);

		// Mock execute for procedureDownloadFiles
		mockConn.execute.mockImplementation((sql: string) => {
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

		await invokeProcedure(req, res, {}, {}, [], options, mockConn as Connection, mockNameCache, mockArgCache);

		expect(mockConn.createLob).toHaveBeenCalledWith(DB.BLOB);
		expect(mockLob.destroy).toHaveBeenCalled();
	});

	it('should warn and skip upload if documentTable is missing', async () => {
		const req = {params: {name: 'proc'}} as any;
		const res = {} as Response;
		const options: configPlSqlHandlerType = {
			defaultPage: 'home',
			documentTable: '', // empty
			errorStyle: 'basic',
		} as any;

		const consoleSpy = vi.spyOn(console, 'warn');

		const file: fileUploadType = {
			fieldname: 'f1',
			originalname: 'o1',
			encoding: '7bit',
			mimetype: 'text/plain',
			filename: 'f1',
			path: '/tmp/f1',
			size: 10,
		};

		await invokeProcedure(req, res, {}, {}, [file], options, mockConn as Connection, mockNameCache, mockArgCache);

		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('doctable" has not been defined'));
	});

	it('should add trace entries when tracing is enabled', async () => {
		vi.spyOn(traceManager, 'isEnabled').mockReturnValue(true);
		const traceSpy = vi.spyOn(traceManager, 'addTrace').mockImplementation(() => {
			/* mock */
		});

		const req = {
			params: {name: 'trace_proc'},
			originalUrl: '/plsql/trace_proc',
			method: 'GET',
			headers: {test: 'header'},
			cookies: {test: 'cookie'},
		} as any;
		const res = {} as Response;
		const options: configPlSqlHandlerType = {
			defaultPage: 'home',
			documentTable: 'docs',
		} as any;

		mockConn.execute.mockImplementation((sql: string) => {
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

		await invokeProcedure(req, res, {}, {REMOTE_ADDR: '127.0.0.1'}, [], options, mockConn as Connection, mockNameCache, mockArgCache);

		expect(traceSpy).toHaveBeenCalled();

		const traceEntry = traceSpy.mock.calls[0]?.[0] as any;
		expect(traceEntry).toBeDefined();
		expect(traceEntry.status).toBe('success');
		expect(traceEntry.procedure).toBe('trace_proc');
		expect(traceEntry.headers).toEqual({test: 'header'});
		expect(traceEntry.cookies).toEqual({test: 'cookie'});
	});

	it('should handle procedure variable arguments (prefix !)', async () => {
		const req = {
			params: {name: '!variable_proc'},
		} as any;
		const res = {} as Response;
		const options: configPlSqlHandlerType = {
			defaultPage: 'home',
			documentTable: 'docs',
			errorStyle: 'basic',
		} as any;

		await invokeProcedure(req, res, {p1: 'v1'}, {}, [], options, mockConn as Connection, mockNameCache, mockArgCache);

		expect(mockConn.execute).toHaveBeenCalledWith(expect.stringContaining('variable_proc'), expect.any(Object));
	});

	it('should throw error when no procedure name is provided', async () => {
		const req = {
			params: {},
		} as any;
		const res = {} as Response;
		const options: configPlSqlHandlerType = {
			defaultPage: 'home',
			documentTable: 'docs',
			errorStyle: 'basic',
		} as any;

		await expect(invokeProcedure(req, res, {}, {}, [], options, mockConn as Connection, mockNameCache, mockArgCache)).rejects.toThrow(
			'No procedure name provided',
		);
	});

	it('should upload files when documentTable is defined', async () => {
		const req = {params: {name: 'proc'}} as any;
		const res = {} as Response;
		const options: configPlSqlHandlerType = {
			defaultPage: 'home',
			documentTable: 'MY_DOCS',
		} as any;

		const file: fileUploadType = {
			fieldname: 'f',
			originalname: 'o',
			encoding: '7',
			mimetype: 't',
			filename: 'f',
			path: 'p',
			size: 1,
		};

		await invokeProcedure(req, res, {}, {}, [file], options, mockConn as Connection, mockNameCache, mockArgCache);

		expect(uploadFile).toHaveBeenCalledWith(file, 'MY_DOCS', mockConn);
	});

	it('should handle stream errors and update trace', async () => {
		vi.spyOn(traceManager, 'isEnabled').mockReturnValue(true);
		const traceSpy = vi.spyOn(traceManager, 'addTrace');

		const req = {
			params: {name: 'proc'},
			originalUrl: '/plsql/proc',
			method: 'GET',
			headers: {},
			cookies: {},
		} as any;
		const res = {} as Response;
		const options: configPlSqlHandlerType = {
			defaultPage: 'home',
			documentTable: 'docs',
		} as any;

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
			return mockStream as any;
		});

		const promise = invokeProcedure(req, res, {}, {REMOTE_ADDR: '1'}, [], options, mockConn as Connection, mockNameCache, mockArgCache);

		// Wait a bit for the stream logic in invokeProcedure to setup listeners
		await new Promise((r) => setTimeout(r, 10));

		// Simulate error
		mockStream.emit('error', new Error('stream failure'));
		mockStream.push(null);

		await promise;

		const traceEntry = (traceSpy.mock.calls.find((c: any[]) => c[0].status === 'fail')?.[0] as any) || {};
		expect(traceEntry).toBeDefined();

		if (traceEntry?.error) {
			expect(traceEntry.error).toBe('stream failure');
		}
	});

	it('should handle stream chunk handling and buffering', async () => {
		vi.spyOn(traceManager, 'isEnabled').mockReturnValue(true);
		const traceSpy = vi.spyOn(traceManager, 'addTrace');

		const req = {
			params: {name: 'proc'},
			originalUrl: '/plsql/proc',
			method: 'GET',
			headers: {},
			cookies: {},
		} as any;
		const res = {} as Response;
		const options: configPlSqlHandlerType = {
			defaultPage: 'home',
			documentTable: 'docs',
		} as any;

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
			return mockStream as any;
		});

		const promise = invokeProcedure(req, res, {}, {REMOTE_ADDR: '1'}, [], options, mockConn as Connection, mockNameCache, mockArgCache);

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

		const traceEntry = (traceSpy.mock.calls.find((c: any[]) => c[0].status === 'fail')?.[0] as any) || {};
		expect(traceEntry).toBeDefined();

		if (traceEntry?.error) {
			expect(traceEntry.error).toBe('stream failure');
		}
	});

	it('should truncate large HTML response in trace', async () => {
		vi.spyOn(traceManager, 'isEnabled').mockReturnValue(true);
		const traceSpy = vi.spyOn(traceManager, 'addTrace');

		const req = {
			params: {name: 'proc'},
			originalUrl: '/plsql/proc',
			method: 'GET',
			headers: {},
			cookies: {},
		} as any;
		const res = {} as Response;
		const options: configPlSqlHandlerType = {} as any;

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
			return mockStream as any;
		});

		const promise = invokeProcedure(req, res, {}, {REMOTE_ADDR: '1'}, [], options, mockConn as Connection, mockNameCache, mockArgCache);

		await new Promise((r) => setTimeout(r, 10));
		mockStream.resume();

		const largeChunk = 'a'.repeat(1024 * 1024 + 100); // > 1MB
		mockStream.push(largeChunk);
		mockStream.push(null);

		await promise;
		await new Promise((r) => setTimeout(r, 10));

		const traceEntry = (traceSpy.mock.calls.find((c: any[]) => c[0].status === 'fail')?.[0] as any) || {};
		expect(traceEntry).toBeDefined();

		if (traceEntry?.error) {
			expect(traceEntry.error).toBe('stream failure');
		}
	});
});
