import {describe, it, expect, vi} from 'vitest';
import {getFiles, uploadFile} from '../../../../src/handler/plsql/upload.js';
import * as fileUtils from '../../../../src/util/file.js';

vi.mock('../../../../src/util/file.js');

describe('handler/plsql/upload', () => {
	describe('getFiles', () => {
		it('should return empty if no files property', () => {
			const req = /** @type {any} */ ({});
			expect(getFiles(req)).toEqual([]);
		});

		it('should return empty if files is an empty object', () => {
			const req = /** @type {any} */ ({files: {}});
			expect(getFiles(req)).toEqual([]);
		});

		it('should parse files and append originalname', () => {
			const req = /** @type {any} */ ({
				files: [
					{
						fieldname: 'file1',
						originalname: 'test.txt',
						encoding: '7bit',
						mimetype: 'text/plain',
						destination: '/tmp',
						filename: 'abc',
						path: '/tmp/abc',
						size: 10,
					},
				],
			});
			const files = getFiles(req);
			expect(files).toHaveLength(1);
			expect(files[0]?.filename).toBe('abc/test.txt');
		});
	});

	describe('uploadFile', () => {
		const mockFile = {
			fieldname: 'f',
			originalname: 'o.txt',
			encoding: 'e',
			mimetype: 'm',
			destination: 'd',
			filename: 'n/o.txt',
			path: 'p',
			size: 100,
		};
		const mockConn = /** @type {any} */ ({
			execute: vi.fn().mockResolvedValue({}),
		});

		it('should throw if readFile fails', async () => {
			vi.mocked(fileUtils.readFile).mockRejectedValue(new Error('read failed'));
			await expect(uploadFile(mockFile, 'DOCTAB', mockConn)).rejects.toThrow(/Unable to load file/);
		});

		it('should throw if database insert fails', async () => {
			vi.mocked(fileUtils.readFile).mockResolvedValue(Buffer.from('test'));
			mockConn.execute.mockRejectedValue(new Error('db error'));
			await expect(uploadFile(mockFile, 'DOCTAB', mockConn)).rejects.toThrow(/Unable to insert file/);
		});

		it('should throw if removeFile fails', async () => {
			vi.mocked(fileUtils.readFile).mockResolvedValue(Buffer.from('test'));
			mockConn.execute.mockResolvedValue({});
			vi.mocked(fileUtils.removeFile).mockRejectedValue(new Error('remove failed'));
			await expect(uploadFile(mockFile, 'DOCTAB', mockConn)).rejects.toThrow(/Unable to remove file/);
		});

		it('should upload successfully', async () => {
			vi.mocked(fileUtils.readFile).mockResolvedValue(Buffer.from('test'));
			mockConn.execute.mockResolvedValue({});
			vi.mocked(fileUtils.removeFile).mockResolvedValue(undefined);

			await expect(uploadFile(mockFile, 'DOCTAB', mockConn)).resolves.toBeUndefined();
			expect(mockConn.execute).toHaveBeenCalled();
		});
	});
});
