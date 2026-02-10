import {describe, it, expect, vi} from 'vitest';
import {OWAPageStream} from '../src/backend/handler/plsql/owaPageStream.ts';
import {OWA_STREAM_CHUNK_SIZE} from '../src/common/constants.ts';
import type {Connection} from 'oracledb';

describe('OWAPageStream', () => {
	it('should stream data in chunks', async () => {
		// Create array of chunkSize lines for first chunk
		const firstChunkLines = Array.from({length: OWA_STREAM_CHUNK_SIZE}, (_, i) => `Line ${i + 1}\n`);
		const secondChunkLines = ['Final Line\n'];

		const mockConnection = {
			execute: vi
				.fn()
				.mockResolvedValueOnce({
					outBinds: {lines: firstChunkLines, irows: OWA_STREAM_CHUNK_SIZE},
				})
				.mockResolvedValueOnce({
					outBinds: {lines: secondChunkLines, irows: 1}, // Less than chunkSize, so it should be the last chunk
				}),
		} as unknown as Connection;

		const stream = new OWAPageStream(mockConnection);

		const chunks: string[] = [];
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
		const mockConnection = {
			execute: vi.fn().mockResolvedValueOnce({
				outBinds: {lines: [], irows: 0},
			}),
		} as unknown as Connection;

		const stream = new OWAPageStream(mockConnection);

		const chunks: string[] = [];
		for await (const chunk of stream) {
			chunks.push(chunk.toString());
		}

		expect(chunks).toEqual([]);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockConnection.execute).toHaveBeenCalledTimes(1);
	});

	it('should add initial body content', async () => {
		const mockConnection = {
			execute: vi.fn().mockResolvedValueOnce({
				outBinds: {lines: [], irows: 0},
			}),
		} as unknown as Connection;

		const stream = new OWAPageStream(mockConnection);
		stream.addBody('Initial Content\n');

		const chunks: string[] = [];
		for await (const chunk of stream) {
			chunks.push(chunk.toString());
		}

		expect(chunks).toEqual(['Initial Content\n']);
	});

	it('should handle database errors', async () => {
		const mockConnection = {
			execute: vi.fn().mockRejectedValue(new Error('DB Error')),
		} as unknown as Connection;

		const stream = new OWAPageStream(mockConnection);

		try {
			for await (const chunk of stream) {
				// Consume chunk
				expect(chunk).toBeDefined();
			}
		} catch (err) {
			expect(stream.destroyed).toBe(true);
			expect((err as Error).message).toContain('DB Error');
		}
	});

	it('should handle non-Error catch in _read', async () => {
		const mockConnection = {
			execute: vi.fn().mockRejectedValue('String Error'),
		} as unknown as Connection;

		const stream = new OWAPageStream(mockConnection);

		const promise = new Promise((resolve, reject) => {
			stream.on('error', (err) => {
				try {
					expect(err.message).toContain('String Error');
					resolve(true);
				} catch (e) {
					reject(e instanceof Error ? e : new Error(String(e)));
				}
			});
			stream.resume();
		});

		await promise;
	});

	it('should do nothing if addBody called with empty content', () => {
		const mockConnection = {
			execute: vi.fn(),
		} as unknown as Connection;
		const stream = new OWAPageStream(mockConnection);
		const pushSpy = vi.spyOn(stream, 'push');

		stream.addBody('');
		expect(pushSpy).not.toHaveBeenCalled();
	});
});
