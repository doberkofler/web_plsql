import {describe, it, expect, afterEach, vi} from 'vitest';
import {JsonLogger} from '../../src/util/jsonLogger.js';
import fs from 'node:fs';

describe('JsonLogger', () => {
	const createdFiles = new Set();

	/**
	 * @param {string} filename
	 */
	const createLogger = (filename) => {
		createdFiles.add(filename);
		return new JsonLogger(filename);
	};

	afterEach(() => {
		// Cleanup
		for (const file of createdFiles) {
			if (fs.existsSync(file)) {
				try {
					fs.unlinkSync(file);
				} catch (e) {
					// ignore
				}
			}
		}
		createdFiles.clear();
	});

	it('should write a valid JSON log entry', async () => {
		const filename = 'test-valid.log';
		const logger = createLogger(filename);
		/** @type {import('../../src/util/jsonLogger.js').LogEntry} */
		const entry = {
			timestamp: new Date().toISOString(),
			type: 'error',
			message: 'Test error',
			details: {stack: 'Error: Test error'},
		};

		logger.log(entry);

		await new Promise((resolve) => setTimeout(resolve, 100));

		const content = fs.readFileSync(filename, 'utf8');
		const lines = content.trim().split('\n');
		const lastLine = lines[lines.length - 1];
		const parsed = JSON.parse(lastLine);

		expect(parsed).toMatchObject({
			type: 'error',
			message: 'Test error',
		});
		expect(parsed.timestamp).toBeDefined();
		expect(parsed.details.stack).toBe('Error: Test error');

		logger.close();
	});

	it('should add timestamp if missing', async () => {
		const filename = 'test-timestamp.log';
		const logger = createLogger(filename);
		/** @type {import('../../src/util/jsonLogger.js').LogEntry} */
		// @ts-expect-error - missing timestamp
		const entry = {
			type: 'error',
			message: 'No timestamp',
		};

		logger.log(entry);

		await new Promise((resolve) => setTimeout(resolve, 100));

		const content = fs.readFileSync(filename, 'utf8');
		const lines = content.trim().split('\n');
		const lastLine = lines[lines.length - 1];
		const parsed = JSON.parse(lastLine);

		expect(parsed.timestamp).toBeDefined();
		expect(parsed.message).toBe('No timestamp');

		logger.close();
	});

	it('should handle circular structures safely if JSON.stringify throws (caught internally)', () => {
		const filename = 'test-circular.log';
		const logger = createLogger(filename);
		const circular = {};
		circular.self = circular;

		expect(() => {
			logger.log({
				timestamp: new Date().toISOString(),
				type: 'error',
				message: 'Circular',
				details: circular,
			});
		}).not.toThrow();

		logger.close();
	});

	it('should close the stream', () => {
		const filename = 'test-close.log';
		const logger = createLogger(filename);
		// Mock internal stream
		const mockEnd = vi.fn();
		// @ts-expect-error - partial mock
		logger.stream = {
			write: vi.fn(),
			end: mockEnd,
			on: vi.fn(),
			once: vi.fn(),
			emit: vi.fn(),
		};
		logger.close();
		expect(mockEnd).toHaveBeenCalled();
	});

	it('should handle write errors', () => {
		const filename = 'test-error.log';
		const logger = createLogger(filename);
		// @ts-expect-error - partial mock
		logger.stream = {
			write: vi.fn().mockImplementation(() => {
				throw new Error('Write failed');
			}),
			end: vi.fn(),
			on: vi.fn(),
			once: vi.fn(),
			emit: vi.fn(),
		};
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
			// ignore
		});

		logger.log({
			timestamp: new Date().toISOString(),
			type: 'error',
			message: 'test',
		});

		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to write log'), expect.any(Error));
		logger.close(); // Just in case
	});
});
