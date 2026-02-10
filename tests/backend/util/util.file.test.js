import assert from 'node:assert';
import {describe, it, beforeAll, afterAll} from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import {readFileSyncUtf8, readFile, removeFile, getJsonFile, isDirectory, isFile} from '../../../src/util/file.js';

const TEST_DIR = 'tests/temp_file_test';
const TEST_FILE_TXT = path.join(TEST_DIR, 'test.txt');
const TEST_FILE_JSON = path.join(TEST_DIR, 'test.json');
const NON_EXISTENT_FILE = path.join(TEST_DIR, 'nonexistent.txt');

describe('util/file', () => {
	beforeAll(async () => {
		await fs.mkdir(TEST_DIR, {recursive: true});
		await fs.writeFile(TEST_FILE_TXT, 'hello world', 'utf8');
		await fs.writeFile(TEST_FILE_JSON, '{"foo": "bar"}', 'utf8');
	});

	afterAll(async () => {
		await fs.rm(TEST_DIR, {recursive: true, force: true});
	});

	describe('readFileSyncUtf8', () => {
		it('should read file content as utf8', () => {
			const content = readFileSyncUtf8(TEST_FILE_TXT);
			assert.strictEqual(content, 'hello world');
		});

		it('should throw error if file does not exist', () => {
			assert.throws(() => {
				readFileSyncUtf8(NON_EXISTENT_FILE);
			}, /Unable to read file/);
		});
	});

	describe('readFile', () => {
		it('should read file content as buffer', async () => {
			const content = await readFile(TEST_FILE_TXT);
			assert.ok(Buffer.isBuffer(content));
			assert.strictEqual(content.toString('utf8'), 'hello world');
		});

		it('should throw error if file does not exist', async () => {
			await assert.rejects(async () => {
				await readFile(NON_EXISTENT_FILE);
			}, /Unable to read file/);
		});
	});

	describe('getJsonFile', () => {
		it('should parse json file', () => {
			const content = getJsonFile(TEST_FILE_JSON);
			assert.deepStrictEqual(content, {foo: 'bar'});
		});

		it('should throw error if file does not exist', () => {
			assert.throws(() => {
				getJsonFile(NON_EXISTENT_FILE);
			}, /Unable to load file/);
		});

		it('should throw error if json is invalid', async () => {
			const invalidJsonPath = path.join(TEST_DIR, 'invalid.json');
			await fs.writeFile(invalidJsonPath, '{foo: bar}', 'utf8'); // Invalid JSON
			assert.throws(() => {
				getJsonFile(invalidJsonPath);
			}, /Unable to load file/);
		});
	});

	describe('isDirectory', () => {
		it('should return true for directory', async () => {
			const result = await isDirectory(TEST_DIR);
			assert.strictEqual(result, true);
		});

		it('should return false for file', async () => {
			const result = await isDirectory(TEST_FILE_TXT);
			assert.strictEqual(result, false);
		});

		it('should return false (or throw? verify impl) for non-existent path', async () => {
			// fs.stat throws for non-existent files.
			// isDirectory implementation:
			// const stats = await fs.stat(directoryPath);
			// return stats.isDirectory();
			// So it will throw.
			await assert.rejects(async () => {
				await isDirectory(NON_EXISTENT_FILE);
			});
		});

		it('should return false if input is not a string', async () => {
			const result = await isDirectory(null);
			assert.strictEqual(result, false);
		});
	});

	describe('isFile', () => {
		it('should return true for file', async () => {
			const result = await isFile(TEST_FILE_TXT);
			assert.strictEqual(result, true);
		});

		it('should return false for directory', async () => {
			const result = await isFile(TEST_DIR);
			assert.strictEqual(result, false);
		});

		it('should return false for non-existent path', async () => {
			// isFile implementation catches error and returns false
			const result = await isFile(NON_EXISTENT_FILE);
			assert.strictEqual(result, false);
		});

		it('should return false if input is not a string', async () => {
			const result = await isFile(null);
			assert.strictEqual(result, false);
		});
	});

	describe('removeFile', () => {
		it('should remove file', async () => {
			const fileToRemove = path.join(TEST_DIR, 'toremove.txt');
			await fs.writeFile(fileToRemove, 'temp', 'utf8');
			await removeFile(fileToRemove);

			// Verify it's gone
			try {
				await fs.stat(fileToRemove);
				assert.fail('File should be gone');
			} catch (err) {
				/** @type {any} */
				const error = err;
				assert.strictEqual(error.code, 'ENOENT');
			}
		});

		it('should throw error if file cannot be removed (e.g. non-existent)', async () => {
			await assert.rejects(async () => {
				await removeFile(NON_EXISTENT_FILE);
			}, /Unable to remove file/);
		});
	});
});
