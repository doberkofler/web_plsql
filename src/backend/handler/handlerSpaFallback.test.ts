import {describe, it, expect, vi, beforeEach} from 'vitest';
import {createSpaFallback} from './handlerSpaFallback.ts';
import type {Request, Response, NextFunction} from 'express';
import path from 'node:path';

describe('handler/handlerSpaFallback', () => {
	let mockReq: Partial<Request>;
	let mockRes: Partial<Response>;
	let mockNext: NextFunction;
	let sendFileSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		sendFileSpy = vi.fn((_, callback) => {
			if (callback) callback(null);
		});

		mockReq = {
			method: 'GET',
			headers: {
				accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			},
			path: '/tasks',
		};

		mockRes = {
			sendFile: sendFileSpy as unknown as Response['sendFile'],
		};

		mockNext = vi.fn();
	});

	it('should create a request handler function', () => {
		const handler = createSpaFallback('/test/path', '/app');
		expect(typeof handler).toBe('function');
	});

	it('should serve index.html for GET requests with HTML accept header', () => {
		const handler = createSpaFallback('/test/path', '/app');
		handler(mockReq as Request, mockRes as Response, mockNext);

		expect(sendFileSpy).toHaveBeenCalledWith(path.join('/test/path', 'index.html'), expect.any(Function));
		expect(mockNext).not.toHaveBeenCalled();
	});

	it('should serve index.html for HEAD requests', () => {
		mockReq.method = 'HEAD';
		const handler = createSpaFallback('/test/path', '/app');
		handler(mockReq as Request, mockRes as Response, mockNext);

		expect(sendFileSpy).toHaveBeenCalled();
		expect(mockNext).not.toHaveBeenCalled();
	});

	it('should call next() for POST requests', () => {
		mockReq.method = 'POST';
		const handler = createSpaFallback('/test/path', '/app');
		handler(mockReq as Request, mockRes as Response, mockNext);

		expect(sendFileSpy).not.toHaveBeenCalled();
		expect(mockNext).toHaveBeenCalled();
	});

	it('should call next() for PUT requests', () => {
		mockReq.method = 'PUT';
		const handler = createSpaFallback('/test/path', '/app');
		handler(mockReq as Request, mockRes as Response, mockNext);

		expect(sendFileSpy).not.toHaveBeenCalled();
		expect(mockNext).toHaveBeenCalled();
	});

	it('should call next() for DELETE requests', () => {
		mockReq.method = 'DELETE';
		const handler = createSpaFallback('/test/path', '/app');
		handler(mockReq as Request, mockRes as Response, mockNext);

		expect(sendFileSpy).not.toHaveBeenCalled();
		expect(mockNext).toHaveBeenCalled();
	});

	it('should call next() for requests with Accept: application/json', () => {
		mockReq.headers = {accept: 'application/json'};
		const handler = createSpaFallback('/test/path', '/app');
		handler(mockReq as Request, mockRes as Response, mockNext);

		expect(sendFileSpy).not.toHaveBeenCalled();
		expect(mockNext).toHaveBeenCalled();
	});

	it('should call next() for requests with Accept: image/png', () => {
		mockReq.headers = {accept: 'image/png'};
		const handler = createSpaFallback('/test/path', '/app');
		handler(mockReq as Request, mockRes as Response, mockNext);

		expect(sendFileSpy).not.toHaveBeenCalled();
		expect(mockNext).toHaveBeenCalled();
	});

	it('should call next() for requests with Accept: text/css', () => {
		mockReq.headers = {accept: 'text/css'};
		const handler = createSpaFallback('/test/path', '/app');
		handler(mockReq as Request, mockRes as Response, mockNext);

		expect(sendFileSpy).not.toHaveBeenCalled();
		expect(mockNext).toHaveBeenCalled();
	});

	it('should serve index.html when Accept header includes */*', () => {
		mockReq.headers = {accept: '*/*'};
		const handler = createSpaFallback('/test/path', '/app');
		handler(mockReq as Request, mockRes as Response, mockNext);

		expect(sendFileSpy).toHaveBeenCalled();
		expect(mockNext).not.toHaveBeenCalled();
	});

	it('should serve index.html when Accept header is missing', () => {
		mockReq.headers = {};
		const handler = createSpaFallback('/test/path', '/app');
		handler(mockReq as Request, mockRes as Response, mockNext);

		expect(sendFileSpy).toHaveBeenCalled();
		expect(mockNext).not.toHaveBeenCalled();
	});

	it('should call next with error when index.html is missing', () => {
		const testError = new Error('ENOENT: no such file');
		sendFileSpy.mockImplementation((_, callback) => {
			if (callback) callback(testError);
		});

		const handler = createSpaFallback('/test/path', '/app');
		handler(mockReq as Request, mockRes as Response, mockNext);

		expect(sendFileSpy).toHaveBeenCalled();
		expect(mockNext).toHaveBeenCalledWith(testError);
	});

	it('should use correct index.html path for different directories', () => {
		const handler = createSpaFallback('/custom/dir', '/app');
		handler(mockReq as Request, mockRes as Response, mockNext);

		expect(sendFileSpy).toHaveBeenCalledWith(path.join('/custom/dir', 'index.html'), expect.any(Function));
	});

	it('should handle nested route paths', () => {
		const nestedReq = {...mockReq, path: '/app/nested/deep/route'};
		const handler = createSpaFallback('/test/path', '/app');
		handler(nestedReq as Request, mockRes as Response, mockNext);

		expect(sendFileSpy).toHaveBeenCalled();
		expect(mockNext).not.toHaveBeenCalled();
	});
});
