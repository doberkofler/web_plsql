import {describe, it, expect, vi, beforeEach} from 'vitest';
import oracledb from 'oracledb';
import {Readable} from 'node:stream';
import {invokeProcedure} from '../src/handler/plsql/procedure.js';
import {ProcedureError} from '../src/handler/plsql/procedureError.js';

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
		file: {fileType: null, fileSize: null, fileBlob: null},
	})),
}));

vi.mock('../src/handler/plsql/sendResponse.js', () => ({
	sendResponse: vi.fn().mockResolvedValue(undefined),
}));

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
			if (sql.includes('owa.get_page')) {
				return Promise.resolve({outBinds: {lines: [], irows: 0}});
			}
			if (sql.includes('wpg_docload.is_file_download()')) {
				return Promise.resolve({outBinds: {fileType: '', fileSize: 0, fileBlob: null}});
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
});
