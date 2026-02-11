import {describe, it, expect, vi} from 'vitest';

vi.mock('multer', () => {
	const mockDiskStorage = vi.fn().mockReturnValue({});
	const mockUploadAny = vi.fn(() => (_req: any, _res: any, next: any) => next());
	const mockMulter = vi.fn().mockImplementation(() => ({
		any: mockUploadAny,
	}));
	(mockMulter as any).diskStorage = mockDiskStorage;

	return {
		default: mockMulter,
	};
});

import multer from 'multer';
import {handlerUpload} from './handlerUpload.ts';

describe('handler/handlerUpload', () => {
	it('should create upload middleware without file size limit', () => {
		const handler = handlerUpload();

		expect(handler).toBeDefined();
		expect(typeof handler).toBe('function');
		expect(multer).toHaveBeenCalled();
		expect(multer).toHaveBeenCalledWith({
			storage: expect.any(Object),
			limits: {},
		});
	});

	it('should create upload middleware with diskStorage', () => {
		handlerUpload();

		expect(multer.diskStorage).toHaveBeenCalledWith({});
	});

	it('should create upload middleware with file size limit when specified', () => {
		const fileSizeLimit = 1024 * 1024 * 5;

		handlerUpload(fileSizeLimit);

		expect(multer).toHaveBeenCalledWith({
			storage: expect.any(Object),
			limits: {
				fileSize: fileSizeLimit,
			},
		});
	});

	it('should not set fileSize limit when uploadFileSizeLimit is undefined', () => {
		handlerUpload(undefined);

		expect(multer).toHaveBeenCalledWith({
			storage: expect.any(Object),
			limits: {},
		});
	});

	it('should create upload middleware with zero file size limit', () => {
		handlerUpload(0);

		expect(multer).toHaveBeenCalledWith({
			storage: expect.any(Object),
			limits: {
				fileSize: 0,
			},
		});
	});

	it('should create upload middleware with large file size limit', () => {
		const largeFileSize = 1024 * 1024 * 100;

		handlerUpload(largeFileSize);

		expect(multer).toHaveBeenCalledWith({
			storage: expect.any(Object),
			limits: {
				fileSize: largeFileSize,
			},
		});
	});

	it('should return a RequestHandler type function', () => {
		const handler = handlerUpload();

		expect(handler).toBeInstanceOf(Function);
	});
});
