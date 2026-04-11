import {describe, it, vi, expect} from 'vitest';
import {Readable} from 'node:stream';
import {sendResponse} from './sendResponse.js';
import type {Response} from 'express';
import type {pageType} from '../../types.ts';

describe('handler/plsql/sendResponse_extra', () => {
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

		// Mock pipe to emit 'end' on the stream to resolve the promise
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
});