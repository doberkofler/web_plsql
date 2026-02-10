import {describe, it, expect, afterEach, vi} from 'vitest';
import {JsonLogger} from '../../../src/backend/util/jsonLogger.ts';
import fs from 'node:fs';
import type {LogEntry} from '../../../src/backend/util/jsonLogger.ts';

describe('JsonLogger', () => {
	const createdFiles = new Set<string>();

	/**
	 * @param filename
	 */
	const createLogger = (filename: string) => {
		createdFiles.add(filename);
		return new JsonLogger(filename);
	};

	afterEach(() => {
		// Cleanup
		for (const file of createdFiles) {
			if (fs.existsSync(file)) {
				try {
					fs.unlinkSync(file);
				} catch {
					// ignore
				}
			}
		}
		createdFiles.clear();
	});

	it('should write a valid JSON log entry', async () => {
		const filename = 'test-valid.log';
		const logger = createLogger(filename);
		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			type: 'error',
			message: 'Test error',
			details: {stack: 'Error: Test error'},
		};

		logger.log(entry);

		// Wait and close to ensure it's written
		await new Promise((resolve) => {
			logger.stream.on('finish', () => resolve(undefined));
			logger.close();
		});

		const content = fs.readFileSync(filename, 'utf8');
		const lines = content.trim().split('\n');
		const lastLine = lines[lines.length - 1];
		if (!lastLine) throw new Error('No last line found');
		const parsed = JSON.parse(lastLine) as LogEntry & {details: {stack: string}};

		expect(parsed).toMatchObject({
			type: 'error',
			message: 'Test error',
		});
		expect(parsed.timestamp).toBeDefined();
		expect(parsed.details.stack).toBe('Error: Test error');
	});

	it('should add timestamp if missing', async () => {
		const filename = 'test-timestamp.log';
		const logger = createLogger(filename);
		const entry: LogEntry = {
			type: 'error',
			message: 'No timestamp',
		};

		logger.log(entry);

		// Wait and close to ensure it's written
		await new Promise((resolve) => {
			logger.stream.on('finish', () => resolve(undefined));
			logger.close();
		});

		const content = fs.readFileSync(filename, 'utf8');
		const lines = content.trim().split('\n');
		const lastLine = lines[lines.length - 1];
		if (!lastLine) throw new Error('No last line found');
		const parsed = JSON.parse(lastLine) as LogEntry;

		expect(parsed.timestamp).toBeDefined();
		expect(parsed.message).toBe('No timestamp');
	});

	it('should handle circular structures safely if JSON.stringify throws (caught internally)', () => {
		const filename = 'test-circular.log';
		const logger = createLogger(filename);

		const circular: any = {};
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

		(logger.stream as any) = {
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

		(logger.stream as any) = {
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
