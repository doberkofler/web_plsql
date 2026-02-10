import {describe, it, expect, vi} from 'vitest';
import {OWAPageStream} from '../src/handler/plsql/owaPageStream.js';
import {OWA_STREAM_CHUNK_SIZE} from '../src/constants.js';

/** @typedef {import('oracledb').Connection} Connection */

describe('OWAPageStream', () => {
	it('should stream data in chunks', async () => {
		// Create array of chunkSize lines for first chunk
		const firstChunkLines = Array.from({length: OWA_STREAM_CHUNK_SIZE}, (_, i) => `Line ${i + 1}\n`);
		const secondChunkLines = ['Final Line\n'];

		const mockConnection = /** @type {Connection} */ (
			/** @type {unknown} */ ({
				execute: vi
					.fn()
					.mockResolvedValueOnce({
						outBinds: {lines: firstChunkLines, irows: OWA_STREAM_CHUNK_SIZE},
					})
					.mockResolvedValueOnce({
						outBinds: {lines: secondChunkLines, irows: 1}, // Less than chunkSize, so it should be the last chunk
					}),
			})
		);

		const stream = new OWAPageStream(mockConnection);

		const chunks = [];
		for await (const chunk of stream) {
			chunks.push(chunk.toString());
		}

		expect(chunks.length).toBe(2);
		expect(chunks[0]).toBe(firstChunkLines.join(''));
		expect(chunks[1]).toBe('Final Line\n');
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockConnection.execute).toHaveBeenCalledTimes(2);
	});

	it('should handle empty response', async () => {
		const mockConnection = /** @type {Connection} */ (
			/** @type {unknown} */ ({
				execute: vi.fn().mockResolvedValueOnce({
					outBinds: {lines: [], irows: 0},
				}),
			})
		);

		const stream = new OWAPageStream(mockConnection);

		const chunks = [];
		for await (const chunk of stream) {
			chunks.push(chunk.toString());
		}

		expect(chunks).toEqual([]);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockConnection.execute).toHaveBeenCalledTimes(1);
	});

	it('should add initial body content', async () => {
		const mockConnection = /** @type {Connection} */ (
			/** @type {unknown} */ ({
				execute: vi.fn().mockResolvedValueOnce({
					outBinds: {lines: [], irows: 0},
				}),
			})
		);

		const stream = new OWAPageStream(mockConnection);
		stream.addBody('Initial Content\n');

		const chunks = [];
		for await (const chunk of stream) {
			chunks.push(chunk.toString());
		}

		expect(chunks).toEqual(['Initial Content\n']);
	});

	it('should handle database errors', async () => {
		const mockConnection = /** @type {Connection} */ (
			/** @type {unknown} */ ({
				execute: vi.fn().mockRejectedValue(new Error('DB Error')),
			})
		);

		const stream = new OWAPageStream(mockConnection);

		try {
			for await (const chunk of stream) {
				// Consume chunk
				expect(chunk).toBeDefined();
			}
		} catch (err) {
			expect(stream.destroyed).toBe(true);
		}
	});

	it('should propagate ProcedureError', async () => {
		const mockConnection = /** @type {Connection} */ (
			/** @type {unknown} */ ({
				execute: vi.fn().mockRejectedValue(new Error('DB Error')),
			})
		);

		const stream = new OWAPageStream(mockConnection);

		const promise = new Promise((resolve, reject) => {
			stream.on('error', reject);
			stream.on('data', () => {
				// Handle data event
			});
			stream.on('end', resolve);
		});

		await expect(promise).rejects.toThrow();
	});
});
