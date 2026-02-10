import assert from 'node:assert';
import {describe, it, vi, expect} from 'vitest';
import {Readable} from 'node:stream';
import {sendResponse} from '../../../../src/backend/handler/plsql/sendResponse.ts';
import debugModule from 'debug';
import type {Request, Response} from 'express';
import type {pageType} from '../../../../src/backend/types.ts';

describe('handler/plsql/sendResponse', () => {
	const createMockRes = () =>
		({
			cookie: vi.fn(),
			redirect: vi.fn(),
			set: vi.fn(),
			writeHead: vi.fn(),
			end: vi.fn(),
			status: vi.fn().mockReturnThis(),
			send: vi.fn(),
		}) as unknown as Response;

	const createEmptyPage = (): pageType => ({
		head: {
			cookies: [],
			otherHeaders: {},
		},
		file: {
			fileType: null,
			fileSize: null,
			fileBlob: null,
		},
		body: '',
	});

	it('should send simple body', async () => {
		const res = createMockRes();
		const page = createEmptyPage();
		page.body = '<html></html>';
		const req = {} as Request;

		await sendResponse(req, res, page);

		assert.strictEqual((res.send as any).mock.calls.length, 1);

		assert.strictEqual((res.send as any).mock.calls[0][0], '<html></html>');
	});

	it('should set cookies', async () => {
		const res = createMockRes();
		const page = createEmptyPage();
		page.head.cookies = [
			{name: 'c1', value: 'v1', options: {httpOnly: true}},
			{name: 'c2', value: 'v2', options: {secure: true}},
		];
		const req = {} as Request;

		await sendResponse(req, res, page);

		assert.strictEqual((res.cookie as any).mock.calls.length, 2);

		assert.strictEqual((res.cookie as any).mock.calls[0][0], 'c1');

		assert.strictEqual((res.cookie as any).mock.calls[0][1], 'v1');

		assert.deepStrictEqual((res.cookie as any).mock.calls[0][2], {httpOnly: true});
	});

	it('should handle redirect', async () => {
		const res = createMockRes();
		const page = createEmptyPage();
		page.head.redirectLocation = '/new-location';
		const req = {} as Request;

		await sendResponse(req, res, page);

		assert.strictEqual((res.redirect as any).mock.calls.length, 1);

		assert.strictEqual((res.redirect as any).mock.calls[0][0], 302);

		assert.strictEqual((res.redirect as any).mock.calls[0][1], '/new-location');
		// Should return early and not send body

		assert.strictEqual((res.send as any).mock.calls.length, 0);
	});

	it('should set custom headers', async () => {
		const res = createMockRes();
		const page = createEmptyPage();
		page.head.otherHeaders = {'X-Custom': 'Value'};
		const req = {} as Request;

		await sendResponse(req, res, page);

		assert.strictEqual((res.set as any).mock.calls.length, 1);

		assert.strictEqual((res.set as any).mock.calls[0][0], 'X-Custom');

		assert.strictEqual((res.set as any).mock.calls[0][1], 'Value');
	});

	it('should handle file download (fileType B) with buffer', async () => {
		const res = createMockRes();
		const page = createEmptyPage();
		page.file = {fileType: 'B', fileBlob: Buffer.from('data'), fileSize: 4};
		page.head.contentType = 'application/pdf';
		const req = {} as Request;

		await sendResponse(req, res, page);

		assert.strictEqual((res.writeHead as any).mock.calls.length, 1);

		assert.strictEqual((res.writeHead as any).mock.calls[0][0], 200);

		assert.deepStrictEqual((res.writeHead as any).mock.calls[0][1], {
			'Content-Type': 'application/pdf',
			'Content-Length': '4',
		});

		assert.strictEqual((res.end as any).mock.calls.length, 1);

		assert.ok((res.end as any).mock.calls[0][0].equals(page.file.fileBlob));

		assert.strictEqual((res.end as any).mock.calls[0][1], 'binary');
	});

	it('should handle status code', async () => {
		const res = createMockRes();
		const page = createEmptyPage();
		page.head.statusCode = 404;
		page.head.statusDescription = 'Not Found Custom';
		const req = {} as Request;

		await sendResponse(req, res, page);

		assert.strictEqual((res.status as any).mock.calls.length, 1);

		assert.strictEqual((res.status as any).mock.calls[0][0], 404);

		assert.strictEqual((res.send as any).mock.calls.length, 1);

		assert.strictEqual((res.send as any).mock.calls[0][0], 'Not Found Custom');
	});

	it('should handle status code with debug enabled', async () => {
		const debug = debugModule('webplsql:sendResponse');
		const originalEnabled = debug.enabled;
		debug.enabled = true;

		try {
			const res = createMockRes();
			const page = createEmptyPage();
			page.head.statusCode = 404;
			page.head.statusDescription = 'Not Found Custom';
			const req = {} as Request;

			await sendResponse(req, res, page);
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(res.status).toHaveBeenCalledWith(404);
		} finally {
			debug.enabled = originalEnabled;
		}
	});

	it('should send simple body with debug enabled', async () => {
		const debug = debugModule('webplsql:sendResponse');
		const originalEnabled = debug.enabled;
		debug.enabled = true;

		try {
			const res = createMockRes();
			const page = createEmptyPage();
			page.body = '<html></html>';
			page.head.cookies = [{name: 'c', value: 'v', options: {}}];
			page.head.redirectLocation = '/red';
			page.head.otherHeaders = {'X-Test': 'Test'};
			const req = {} as Request;

			await sendResponse(req, res, page);
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(res.redirect).toHaveBeenCalled();
		} finally {
			debug.enabled = originalEnabled;
		}
	});

	it('should handle file download with debug enabled', async () => {
		const debug = debugModule('webplsql:sendResponse');
		const originalEnabled = debug.enabled;
		debug.enabled = true;

		try {
			const res = createMockRes();
			const page = createEmptyPage();
			page.file = {fileType: 'B', fileBlob: Buffer.from('data'), fileSize: 4};
			page.head.contentType = 'application/pdf';
			const req = {} as Request;

			await sendResponse(req, res, page);
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(res.end).toHaveBeenCalled();
		} finally {
			debug.enabled = originalEnabled;
		}
	});

	it('should handle file download with streaming and debug enabled', async () => {
		const debug = debugModule('webplsql:sendResponse');
		const originalEnabled = debug.enabled;
		debug.enabled = true;

		try {
			const pipeMock = vi.fn();
			const res = {
				writeHead: vi.fn(),
				on: vi.fn(),
			} as unknown as Response;
			const mockStream = new Readable({
				read() {
					this.push('test data');
					this.push(null);
				},
			});

			(mockStream.pipe as any) = pipeMock.mockImplementation((_destination: any) => {
				setTimeout(() => mockStream.emit('end'), 10);
				return res;
			});

			const page = createEmptyPage();
			page.file = {fileType: 'B', fileBlob: mockStream, fileSize: 9};
			page.head.contentType = 'application/octet-stream';
			const req = {} as Request;

			await sendResponse(req, res, page);
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(res.writeHead).toHaveBeenCalled();
		} finally {
			debug.enabled = originalEnabled;
		}
	});

	it('should set Content-Type header', async () => {
		const res = createMockRes();
		const page = createEmptyPage();
		page.head.contentType = 'text/plain';
		const req = {} as Request;

		await sendResponse(req, res, page);

		assert.ok((res.set as any).mock.calls.some((call: any) => call[0] === 'Content-Type' && call[1] === 'text/plain'));
	});

	it('should handle file download without content type or length', async () => {
		const res = createMockRes();
		const page = createEmptyPage();
		page.file = {fileType: 'B', fileBlob: Buffer.from('data'), fileSize: 0}; // 0 size
		page.head.contentType = ''; // Empty
		const req = {} as Request;

		await sendResponse(req, res, page);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(res.writeHead).not.toHaveBeenCalled();
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(res.end).toHaveBeenCalled();
	});

	it('should handle body as stream', async () => {
		const res = createMockRes();
		// Add stream methods to res mock
		(res as any).on = vi.fn();
		(res as any).once = vi.fn();
		(res as any).emit = vi.fn();
		(res as any).write = vi.fn();

		const page = createEmptyPage();
		const streamBody = new Readable({
			read() {
				this.push('stream content');
				this.push(null);
			},
		});
		page.body = streamBody;
		const req = {} as Request;

		// Mock pipe to trigger end
		vi.spyOn(streamBody, 'pipe').mockImplementation((_dest) => {
			setTimeout(() => streamBody.emit('end'), 10);
			return _dest as any;
		});

		await sendResponse(req, res, page);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(streamBody.pipe).toHaveBeenCalledWith(res);
	});

	it('should handle file download stream error', async () => {
		const res = createMockRes();
		(res as any).on = vi.fn();

		const page = createEmptyPage();
		const mockStream = new Readable({
			read() {
				// push something
				this.push('data');
			},
		});
		page.file = {fileType: 'B', fileBlob: mockStream, fileSize: 10};
		const req = {} as Request;

		// Mock pipe
		vi.spyOn(mockStream, 'pipe').mockReturnValue(res as any);

		const promise = sendResponse(req, res, page);

		// Emit error asynchronously
		setTimeout(() => mockStream.emit('error', new Error('stream error')), 10);

		await expect(promise).rejects.toThrow('stream error');
	});

	it('should handle body stream error', async () => {
		const res = createMockRes();
		(res as any).on = vi.fn();

		const page = createEmptyPage();
		const mockStream = new Readable({
			read() {
				this.push('data');
			},
		});
		page.body = mockStream;
		const req = {} as Request;

		// Mock pipe
		vi.spyOn(mockStream, 'pipe').mockReturnValue(res as any);

		const promise = sendResponse(req, res, page);

		// Emit error asynchronously
		setTimeout(() => mockStream.emit('error', new Error('body error')), 10);

		await expect(promise).rejects.toThrow('body error');
	});
});
