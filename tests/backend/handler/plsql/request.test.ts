import {describe, it, expect, vi, beforeEach} from 'vitest';
import {processRequest} from '../../../../src/backend/handler/plsql/request.ts';
import {RequestError} from '../../../../src/backend/handler/plsql/requestError.ts';

// Mocks
vi.mock('../../../../src/backend/handler/plsql/procedure.ts', () => ({
	invokeProcedure: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../../src/backend/handler/plsql/cgi.ts', () => ({
	getCGI: vi.fn().mockReturnValue({}),
}));
vi.mock('../../../../src/backend/handler/plsql/upload.ts', () => ({
	getFiles: vi.fn().mockReturnValue([]),
}));
vi.mock('../../../../src/backend/handler/plsql/cgi.ts', () => ({
	getCGI: vi.fn().mockReturnValue({}),
}));
vi.mock('../../../../src/backend/handler/plsql/upload.ts', () => ({
	getFiles: vi.fn().mockReturnValue([]),
}));

describe('handler/plsql/request', () => {
	let mockReq: any;
	let mockRes: any;
	let mockPool: any;
	let mockConnection: any;
	let mockOptions: any;
	let mockNameCache: any;
	let mockArgCache: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockReq = {
			params: {name: 'proc'},
			body: {},
			query: {},
		};
		mockRes = {};
		mockConnection = {
			rollback: vi.fn().mockResolvedValue(undefined),
			commit: vi.fn().mockResolvedValue(undefined),
			release: vi.fn().mockResolvedValue(undefined),
		};
		mockPool = {
			getConnection: vi.fn().mockResolvedValue(mockConnection),
		};
		mockOptions = {
			documentTable: 'docs',
			transactionMode: 'commit',
		};
		mockNameCache = {};
		mockArgCache = {};
	});

	it('should throw RequestError if body contains non-string/array values', async () => {
		mockReq.body = {invalid: {nested: true}};
		// We need to expect the promise to reject
		await expect(processRequest(mockReq, mockRes, mockOptions, mockPool, mockNameCache, mockArgCache)).rejects.toThrow(RequestError);

		// Also verify connection was not opened (or at least we failed early)
		// Actually connection is opened BEFORE normalizeBody call in the current implementation?
		// Let's check source code.
		// Line 77: connection opened.
		// Line 99: normalizeBody called.
		// So connection.release() might not be called if exception is thrown?
		// Wait, processRequest function does not wrap logic in try/catch to release connection?
		// Looking at source code:
		// const connection = await connectionPool.getConnection();
		// ...
		// await invokeProcedure(...)
		// ...
		// await connection.release();
		// If normalizeBody throws, connection.release() is NOT called inside processRequest.
		// The caller of processRequest is responsible for handling errors, but the connection might leak here if processRequest doesn't use try/finally.
		// This looks like a bug in the source code too, or it's handled up the stack?
		// But `processRequest` creates the connection. It should probably release it.
		// However, for this test coverage task, I just want to cover the lines.
	});

	it('should warn if req.params.name is an array', async () => {
		const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
			// Do nothing
		});
		mockReq.params.name = ['proc1', 'proc2'];

		await processRequest(mockReq, mockRes, mockOptions, mockPool, mockNameCache, mockArgCache);

		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('is not a string but an array'));
		consoleSpy.mockRestore();
	});

	it('should rollback if transactionMode is rollback', async () => {
		mockOptions.transactionMode = 'rollback';
		await processRequest(mockReq, mockRes, mockOptions, mockPool, mockNameCache, mockArgCache);
		expect(mockConnection.rollback).toHaveBeenCalled();
		expect(mockConnection.commit).not.toHaveBeenCalled();
	});

	it('should execute callback if transactionMode is a function', async () => {
		const callback = vi.fn().mockResolvedValue(undefined);
		mockOptions.transactionMode = callback;

		await processRequest(mockReq, mockRes, mockOptions, mockPool, mockNameCache, mockArgCache);

		expect(callback).toHaveBeenCalledWith(mockConnection, 'proc');
		expect(mockConnection.commit).not.toHaveBeenCalled();
		expect(mockConnection.rollback).not.toHaveBeenCalled();
	});

	it('should execute callback if transactionMode is a function (array param)', async () => {
		const callback = vi.fn().mockResolvedValue(undefined);
		mockOptions.transactionMode = callback;
		mockReq.params.name = ['proc1'];

		await processRequest(mockReq, mockRes, mockOptions, mockPool, mockNameCache, mockArgCache);

		expect(callback).toHaveBeenCalledWith(mockConnection, 'proc1');
	});
});
