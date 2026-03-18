import type {Readable} from 'node:stream';

/**
 *	Convert a readable stream to a buffer.
 *
 * @param readable - The readable stream.
 * @returns The buffer.
 */
export const streamToBuffer = async (readable: Readable): Promise<Buffer> => {
	return new Promise((resolve, reject) => {
		const buffers: Buffer[] = [];

		readable.on('data', (buffer: Buffer | string) => {
			buffers.push(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer));
		});

		readable.on('end', () => {
			resolve(Buffer.concat(buffers));
		});

		readable.on('error', (err) => {
			/* v8 ignore next - error handler */
			reject(err);
		});
	});
};
