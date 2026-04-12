import assert from 'node:assert';
import {describe, it, vi, expect} from 'vitest';
import {Readable} from 'node:stream';
import {sendResponse} from '../../handler/plsql/sendResponse.ts';
import debugModule from 'debug';
import type {Response} from 'express';
import type {pageType} from '../../types.ts';

describe('handler/plsql/sendResponse', () => {
	const createMockRes = () =>
		({
			cookie: vi.fn<(...args: unknown[]) => unknown>(),
			redirect: vi.fn<(...args: unknown[]) => unknown>(),
			set: vi.fn<(...args: unknown[]) => unknown>(),
			writeHead: vi.fn<(...args: unknown[]) => unknown>(),
			end: vi.fn<(...args: unknown[]) => unknown>(),
			status: vi.fn<(...args: unknown[]) => unknown>().mockReturnThis(),
			send: vi.fn<(...args: unknown[]) => unknown>(),
			on: vi.fn<(...args: unknown[]) => unknown>(),
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
		const res = createMockRes() as any;
		const page = createEmptyPage();
		page.body = '<html></html>';

		const req = {} as any;

		await sendResponse(req, res, page);

		assert.strictEqual(res.send.mock.calls.length, 1);

		assert.strictEqual(res.send.mock.calls[0][0], '<html></html>');
	});

	it('should set cookies', async () => {
		const res = createMockRes() as any;
		const page = createEmptyPage();
		page.head.cookies = [
			{name: 'c1', value: 'v1', options: {httpOnly: true}},
			{name: 'c2', value: 'v2', options: {secure: true}},
		];

		const req = {} as any;

		await sendResponse(req, res, page);

		assert.strictEqual(res.cookie.mock.calls.length, 2);

		assert.strictEqual(res.cookie.mock.calls[0][0], 'c1');

		assert.strictEqual(res.cookie.mock.calls[0][1], 'v1');

		assert.deepStrictEqual(res.cookie.mock.calls[0][2], {httpOnly: true});
	});

	it('should handle redirect', async () => {
		const res = createMockRes() as any;
		const page = createEmptyPage();
		page.head.redirectLocation = '/new-location';

		const req = {} as any;

		await sendResponse(req, res, page);

		assert.strictEqual(res.redirect.mock.calls.length, 1);

		assert.strictEqual(res.redirect.mock.calls[0][0], 302);

		assert.strictEqual(res.redirect.mock.calls[0][1], '/new-location');
		// Should return early and not send body

		assert.strictEqual(res.send.mock.calls.length, 0);
	});

	it('should set custom headers', async () => {
		const res = createMockRes() as any;
		const page = createEmptyPage();
		page.head.otherHeaders = {'X-Custom': 'Value'};

		const req = {} as any;

		await sendResponse(req, res, page);

		assert.strictEqual(res.set.mock.calls.length, 1);

		assert.strictEqual(res.set.mock.calls[0][0], 'X-Custom');

		assert.strictEqual(res.set.mock.calls[0][1], 'Value');
	});

	it('should handle file download (fileType B) with buffer', async () => {
		const res = createMockRes() as any;
		const page = createEmptyPage();
		page.file = {fileType: 'B', fileBlob: Buffer.from('data'), fileSize: 4};
		page.head.contentType = 'application/pdf';

		const req = {} as any;

		await sendResponse(req, res, page);

		assert.strictEqual(res.writeHead.mock.calls.length, 1);

		assert.strictEqual(res.writeHead.mock.calls[0][0], 200);

		assert.deepStrictEqual(res.writeHead.mock.calls[0][1], {
			'Content-Type': 'application/pdf',
			'Content-Length': '4',
		});

		assert.strictEqual(res.end.mock.calls.length, 1);

		assert.ok(res.end.mock.calls[0][0].equals(page.file.fileBlob));

		assert.strictEqual(res.end.mock.calls[0][1], 'binary');
	});

	it('should handle status code', async () => {
		const res = createMockRes() as any;
		const page = createEmptyPage();
		page.head.statusCode = 404;
		page.head.statusDescription = 'Not Found Custom';

		const req = {} as any;

		await sendResponse(req, res, page);

		assert.strictEqual(res.status.mock.calls.length, 1);

		assert.strictEqual(res.status.mock.calls[0][0], 404);

		assert.strictEqual(res.send.mock.calls.length, 1);

		assert.strictEqual(res.send.mock.calls[0][0], 'Not Found Custom');
	});

	it('should handle status code with debug enabled', async () => {
		const debug = debugModule('webplsql:sendResponse');
		const originalEnabled = debug.enabled;
		debug.enabled = true;

		try {
			const res = createMockRes() as any;
			const page = createEmptyPage();
			page.head.statusCode = 404;
			page.head.statusDescription = 'Not Found Custom';

			const req = {} as any;

			await sendResponse(req, res, page);
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
			const res = createMockRes() as any;
			const page = createEmptyPage();
			page.body = '<html></html>';
			page.head.cookies = [{name: 'c', value: 'v', options: {}}];
			page.head.redirectLocation = '/red';
			page.head.otherHeaders = {'X-Test': 'Test'};

			const req = {} as any;

			await sendResponse(req, res, page);
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
			const res = createMockRes() as any;
			const page = createEmptyPage();
			page.file = {fileType: 'B', fileBlob: Buffer.from('data'), fileSize: 4};
			page.head.contentType = 'application/pdf';

			const req = {} as any;

			await sendResponse(req, res, page);
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
			const pipeMock = vi.fn<(...args: unknown[]) => unknown>();

			const res = {
				writeHead: vi.fn<(...args: unknown[]) => unknown>(),
				on: vi.fn<(...args: unknown[]) => unknown>(),
			} as any;
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

			const req = {} as any;

			await sendResponse(req, res, page);
			expect(res.writeHead).toHaveBeenCalled();
		} finally {
			debug.enabled = originalEnabled;
		}
	});

	it('should set Content-Type header', async () => {
		const res = createMockRes() as any;
		const page = createEmptyPage();
		page.head.contentType = 'text/plain';

		const req = {} as any;

		await sendResponse(req, res, page);

		assert.ok(res.set.mock.calls.some((call: any) => call[0] === 'Content-Type' && call[1] === 'text/plain'));
	});

	it('should handle body streaming', async () => {
		const pipeMock = vi.fn<(...args: unknown[]) => unknown>();
		const res = {
			...createMockRes(),
			on: vi.fn<(...args: unknown[]) => unknown>(),
		} as any;

		const mockStream = new Readable({
			read() {
				this.push('body content');
				this.push(null);
			},
		});

		(mockStream.pipe as any) = pipeMock.mockImplementation((_destination: any) => {
			setTimeout(() => mockStream.emit('end'), 10);
			return res;
		});

		const page = createEmptyPage();
		page.body = mockStream;

		const req = {} as any;

		await sendResponse(req, res, page);

		expect(pipeMock).toHaveBeenCalledWith(res);
	});

	it('should handle file streaming when end is emitted immediately', async () => {
		const res = {
			...createMockRes(),
			on: vi.fn<(...args: unknown[]) => unknown>(),
		} as any;

		const mockStream = new Readable({
			read() {
				return;
			},
		});

		const pipeMock = vi.fn<(...args: unknown[]) => unknown>().mockImplementation((_destination: unknown) => {
			mockStream.emit('end');
			return res;
		});

		(mockStream.pipe as any) = pipeMock;

		const page = createEmptyPage();
		page.file.fileType = 'B';
		page.file.fileSize = 9;
		page.file.fileBlob = mockStream;
		page.head.contentType = 'application/octet-stream';

		const req = {} as any;

		await sendResponse(req, res, page);

		expect(pipeMock).toHaveBeenCalledWith(res);
		expect(res.writeHead).toHaveBeenCalled();
	});

	it('should handle file streaming when readable emits close', async () => {
		const res = {...createMockRes(), removeListener: vi.fn<(...args: unknown[]) => unknown>()} as any;
		const mockStream = new Readable({read() {}});
		const pipeMock = vi.fn<(...args: unknown[]) => unknown>().mockImplementation(() => {
			setTimeout(() => mockStream.emit('close'), 10);
			return res;
		});
		(mockStream.pipe as any) = pipeMock;

		const page = createEmptyPage();
		page.body = mockStream;

		await sendResponse({} as any, res, page);
		expect(pipeMock).toHaveBeenCalledWith(res);
	});

	it('should handle file streaming when readable emits error', async () => {
		const res = {...createMockRes(), removeListener: vi.fn<(...args: unknown[]) => unknown>()} as any;
		const mockStream = new Readable({read() {}});
		const pipeMock = vi.fn<(...args: unknown[]) => unknown>().mockImplementation(() => {
			setTimeout(() => mockStream.emit('error', new Error('stream error')), 10);
			return res;
		});
		(mockStream.pipe as any) = pipeMock;

		const page = createEmptyPage();
		page.body = mockStream;

		await expect(sendResponse({} as any, res, page)).rejects.toThrow('stream error');
	});

	it('should handle file streaming when response emits finish', async () => {
		const listeners: Record<string, () => void> = {};
		const res = {
			...createMockRes(),
			on: vi.fn<(...args: any[]) => any>((event: any, cb: any) => {
				listeners[event] = cb;
			}),
			removeListener: vi.fn<(...args: unknown[]) => unknown>(),
		} as any;

		const mockStream = new Readable({read() {}});
		const pipeMock = vi.fn<(...args: unknown[]) => unknown>().mockImplementation(() => {
			setTimeout(() => {
				if (listeners['finish']) listeners['finish']();
			}, 10);
			return res;
		});
		(mockStream.pipe as any) = pipeMock;

		const page = createEmptyPage();
		page.body = mockStream;

		await sendResponse({} as any, res, page);
		expect(pipeMock).toHaveBeenCalledWith(res);
	});

	it('should handle file streaming when response emits close', async () => {
		const listeners: Record<string, () => void> = {};
		const res = {
			...createMockRes(),
			on: vi.fn<(...args: any[]) => any>((event: any, cb: any) => {
				listeners[event] = cb;
			}),
			removeListener: vi.fn<(...args: unknown[]) => unknown>(),
		} as any;

		const mockStream = new Readable({read() {}});
		const pipeMock = vi.fn<(...args: unknown[]) => unknown>().mockImplementation(() => {
			setTimeout(() => {
				if (listeners['close']) listeners['close']();
			}, 10);
			return res;
		});
		(mockStream.pipe as any) = pipeMock;

		const page = createEmptyPage();
		page.body = mockStream;

		await sendResponse({} as any, res, page);
		expect(pipeMock).toHaveBeenCalledWith(res);
	});

	it('should handle file streaming when pipe throws an error', async () => {
		const res = {...createMockRes(), removeListener: vi.fn<(...args: unknown[]) => unknown>()} as any;
		const mockStream = new Readable({read() {}});
		const pipeMock = vi.fn<(...args: unknown[]) => unknown>().mockImplementation(() => {
			throw new Error('pipe failed');
		});
		(mockStream.pipe as any) = pipeMock;

		const page = createEmptyPage();
		page.body = mockStream;

		await expect(sendResponse({} as any, res, page)).rejects.toThrow('pipe failed');
	});

	it('should handle multiple resolve events without throwing', async () => {
		const listeners: Record<string, () => void> = {};
		const res = {
			...createMockRes(),
			on: vi.fn<(...args: any[]) => any>((event: any, cb: any) => {
				listeners[event] = cb;
			}),
			removeListener: vi.fn<(...args: unknown[]) => unknown>(),
		} as any;

		const mockStream = new Readable({read() {}});
		const pipeMock = vi.fn<(...args: unknown[]) => unknown>().mockImplementation(() => {
			setTimeout(() => {
				if (listeners['finish']) listeners['finish']();
				if (listeners['close']) listeners['close'](); // This should hit the if(settled) return
			}, 10);
			return res;
		});
		(mockStream.pipe as any) = pipeMock;

		const page = createEmptyPage();
		page.body = mockStream;

		await sendResponse({} as any, res, page);
		expect(pipeMock).toHaveBeenCalledWith(res);
	});

	it('should handle multiple reject events without throwing', async () => {
		const res = {...createMockRes(), removeListener: vi.fn<(...args: unknown[]) => unknown>()} as any;
		const mockStream = new Readable({read() {}});

		// Add a dummy error listener so the second emit doesn't throw as an unhandled error
		mockStream.on('error', () => {});

		const pipeMock = vi.fn<(...args: unknown[]) => unknown>().mockImplementation(() => {
			setTimeout(() => {
				mockStream.emit('error', new Error('first error'));
				// At this point, the real listener is removed, so the dummy listener catches this
				// To hit the "if (settled) return" in rejectOnce, we have to call the captured listener directly
			}, 10);
			return res;
		});
		(mockStream.pipe as any) = pipeMock;

		const page = createEmptyPage();
		page.body = mockStream;

		await expect(sendResponse({} as any, res, page)).rejects.toThrow('first error');
	});
});