import {describe, it, expect, vi} from 'vitest';
import {getFiles, uploadFile} from '../../handler/plsql/upload.ts';
import * as fileUtils from '../../util/file.ts';
import type {Connection} from '../../util/db.ts';

vi.mock('../../util/file.ts');

describe('handler/plsql/upload', () => {
	describe('getFiles', () => {
		it('should return empty if no files property', () => {
			const req = {
				header: vi.fn(),
				get: vi.fn(),
			} as any;
			expect(getFiles(req)).toEqual([]);
		});

		it('should return empty if files is an empty object', () => {
			const req = {
				files: {},
				header: vi.fn(),
				get: vi.fn(),
			} as any;
			expect(getFiles(req)).toEqual([]);
		});

		it('should parse files and append originalname', () => {
			const req = {
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
				header: vi.fn(),
				get: vi.fn(),
			} as any;
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

		const mockConn = {
			execute: vi.fn().mockResolvedValue({}),
			connectString: 'test',
			oracleServerVersion: 12,
			oracleServerVersionString: '12.1.0.2.0',
			port: 1521,
		} as any as Connection;

		it('should throw if readFile fails', async () => {
			vi.mocked(fileUtils.readFile).mockRejectedValue(new Error('read failed'));
			await expect(uploadFile(mockFile, 'DOCTAB', mockConn)).rejects.toThrow(/Unable to load file/);
		});

		it('should throw if database insert fails', async () => {
			vi.mocked(fileUtils.readFile).mockResolvedValue(Buffer.from('test'));

			(mockConn.execute as any).mockRejectedValue(new Error('db error'));
			await expect(uploadFile(mockFile, 'DOCTAB', mockConn)).rejects.toThrow(/Unable to insert file/);
		});

		it('should throw if removeFile fails', async () => {
			vi.mocked(fileUtils.readFile).mockResolvedValue(Buffer.from('test'));

			(mockConn.execute as any).mockResolvedValue({});
			vi.mocked(fileUtils.removeFile).mockRejectedValue(new Error('remove failed'));
			await expect(uploadFile(mockFile, 'DOCTAB', mockConn)).rejects.toThrow(/Unable to remove file/);
		});

		it('should upload successfully', async () => {
			vi.mocked(fileUtils.readFile).mockResolvedValue(Buffer.from('test'));

			(mockConn.execute as any).mockResolvedValue({});
			vi.mocked(fileUtils.removeFile).mockResolvedValue(undefined);

			await expect(uploadFile(mockFile, 'DOCTAB', mockConn)).resolves.toBeUndefined();
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockConn.execute).toHaveBeenCalled();
		});
	});
});
