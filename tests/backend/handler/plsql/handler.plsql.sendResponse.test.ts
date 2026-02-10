import assert from 'node:assert';
import {describe, it, vi, expect} from 'vitest';
import {Readable} from 'node:stream';
import {sendResponse} from '../../../../src/backend/handler/plsql/sendResponse.ts';
import debugModule from 'debug';
import type {Response} from 'express';
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
			const pipeMock = vi.fn();

			const res = {
				writeHead: vi.fn(),
				on: vi.fn(),
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
});
