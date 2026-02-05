import stream from 'node:stream';

/**
 *	Convert a readable stream to a buffer.
 *
 * @param {stream.Readable} readable - The readable stream.
 * @returns {Promise<Buffer>} The buffer.
 */
export const streamToBuffer = async (readable) => {
	return new Promise((resolve, reject) => {
		/** @type {Buffer[]} */
		const buffers = [];

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
