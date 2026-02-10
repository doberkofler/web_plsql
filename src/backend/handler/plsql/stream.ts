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

		readable.on('data', (buffer) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			buffers.push(buffer);
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
