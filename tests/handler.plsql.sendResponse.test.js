import assert from 'node:assert';
import {describe, it, vi} from 'vitest';
import {Readable} from 'node:stream';
import {sendResponse} from '../src/handler/plsql/sendResponse.js';

describe('handler/plsql/sendResponse', () => {
	const createMockRes = () => ({
		cookie: vi.fn(),
		redirect: vi.fn(),
		set: vi.fn(),
		writeHead: vi.fn(),
		end: vi.fn(),
		status: vi.fn().mockReturnThis(),
		send: vi.fn(),
	});

	const createEmptyPage = () => ({
		head: {
			cookies: [],
			otherHeaders: {},
		},
		file: {},
		body: '',
	});

	it('should send simple body', async () => {
		/** @type {any} */
		const res = createMockRes();
		/** @type {any} */
		const page = createEmptyPage();
		page.body = '<html></html>';
		/** @type {any} */
		const req = {};

		await sendResponse(req, res, page);

		assert.strictEqual(res.send.mock.calls.length, 1);
		assert.strictEqual(res.send.mock.calls[0][0], '<html></html>');
	});

	it('should set cookies', async () => {
		/** @type {any} */
		const res = createMockRes();
		/** @type {any} */
		const page = createEmptyPage();
		page.head.cookies = [
			{name: 'c1', value: 'v1', options: {httpOnly: true}},
			{name: 'c2', value: 'v2', options: {secure: true}},
		];
		/** @type {any} */
		const req = {};

		await sendResponse(req, res, page);

		assert.strictEqual(res.cookie.mock.calls.length, 2);
		assert.strictEqual(res.cookie.mock.calls[0][0], 'c1');
		assert.strictEqual(res.cookie.mock.calls[0][1], 'v1');
		assert.deepStrictEqual(res.cookie.mock.calls[0][2], {httpOnly: true});
	});

	it('should handle redirect', async () => {
		/** @type {any} */
		const res = createMockRes();
		/** @type {any} */
		const page = createEmptyPage();
		page.head.redirectLocation = '/new-location';
		/** @type {any} */
		const req = {};

		await sendResponse(req, res, page);

		assert.strictEqual(res.redirect.mock.calls.length, 1);
		assert.strictEqual(res.redirect.mock.calls[0][0], 302);
		assert.strictEqual(res.redirect.mock.calls[0][1], '/new-location');
		// Should return early and not send body
		assert.strictEqual(res.send.mock.calls.length, 0);
	});

	it('should set custom headers', async () => {
		/** @type {any} */
		const res = createMockRes();
		/** @type {any} */
		const page = createEmptyPage();
		page.head.otherHeaders = {'X-Custom': 'Value'};
		/** @type {any} */
		const req = {};

		await sendResponse(req, res, page);

		assert.strictEqual(res.set.mock.calls.length, 1);
		assert.strictEqual(res.set.mock.calls[0][0], 'X-Custom');
		assert.strictEqual(res.set.mock.calls[0][1], 'Value');
	});

	it('should handle file download (fileType B) with buffer', async () => {
		/** @type {any} */
		const res = createMockRes();
		/** @type {any} */
		const page = createEmptyPage();
		page.file = {fileType: 'B', fileBlob: Buffer.from('data'), fileSize: 4};
		page.head.contentType = 'application/pdf';
		/** @type {any} */
		const req = {};

		await sendResponse(req, res, page);

		assert.strictEqual(res.writeHead.mock.calls.length, 1);
		assert.strictEqual(res.writeHead.mock.calls[0][0], 200);
		assert.deepStrictEqual(res.writeHead.mock.calls[0][1], {'Content-Type': 'application/pdf', 'Content-Length': '4'});
		assert.strictEqual(res.end.mock.calls.length, 1);
		// assert.strictEqual(res.end.mock.calls[0][0], page.file.fileBlob); // Buffer comparison might fail strictEqual
		assert.ok(res.end.mock.calls[0][0].equals(page.file.fileBlob));
		assert.strictEqual(res.end.mock.calls[0][1], 'binary');
	});

	it('should handle status code', async () => {
		/** @type {any} */
		const res = createMockRes();
		/** @type {any} */
		const page = createEmptyPage();
		page.head.statusCode = 404;
		page.head.statusDescription = 'Not Found Custom';
		/** @type {any} */
		const req = {};

		await sendResponse(req, res, page);

		assert.strictEqual(res.status.mock.calls.length, 1);
		assert.strictEqual(res.status.mock.calls[0][0], 404);
		assert.strictEqual(res.send.mock.calls.length, 1);
		assert.strictEqual(res.send.mock.calls[0][0], 'Not Found Custom');
	});

	it('should set Content-Type header', async () => {
		/** @type {any} */
		const res = createMockRes();
		/** @type {any} */
		const page = createEmptyPage();
		page.head.contentType = 'text/plain';
		/** @type {any} */
		const req = {};

		await sendResponse(req, res, page);

		// It might call set multiple times if we have other headers, but here only Content-Type
		// Look at code:
		// 0083| 		res.set('Content-Type', page.head.contentType);
		assert.ok(res.set.mock.calls.some((/** @type {any} */ call) => call[0] === 'Content-Type' && call[1] === 'text/plain'));
	});

	it('should handle file download with streaming', async () => {
		const pipeMock = vi.fn();

		/** @type {any} */
		const res = {
			writeHead: vi.fn(),
			on: vi.fn(),
		};

		// Create a mock readable stream
		const mockStream = new Readable({
			read() {
				this.push('test data');
				this.push(null);
			},
		});

		// Mock pipe to trigger events
		/** @type {any} */
		(mockStream.pipe) = pipeMock.mockImplementation((/** @type {any} */ _destination) => {
			setTimeout(() => mockStream.emit('end'), 10);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			return res;
		});

		/** @type {any} */
		const page = createEmptyPage();
		page.file = {fileType: 'B', fileBlob: mockStream, fileSize: 9};
		page.head.contentType = 'application/octet-stream';
		/** @type {any} */
		const req = {};

		await sendResponse(req, res, page);

		assert.strictEqual(res.writeHead.mock.calls.length, 1);
		assert.strictEqual(res.writeHead.mock.calls[0]?.[0], 200);
		assert.deepStrictEqual(res.writeHead.mock.calls[0]?.[1], {'Content-Type': 'application/octet-stream', 'Content-Length': '9'});
		assert.strictEqual(pipeMock.mock.calls.length, 1);
		assert.strictEqual(pipeMock.mock.calls[0]?.[0], res);
	});
});
