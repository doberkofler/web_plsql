// @flow

const stream = require('stream');

/**
*	Convert a readable stream to a buffer.
*
* @param {stream.Readable} readable - The readable stream.
* @returns {Promise<Buffer>} - The buffer.
*/
async function streamToBuffer(readable: stream.Readable): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const buffers = [];

		readable.on('data', buffer => {
			buffers.push(buffer);
		});

		readable.on('end', () => {
			resolve(Buffer.concat(buffers));
		});

		readable.on('error', err => {
			// istanbul ignore next
			reject(err);
		});
	});
}

module.exports = {
	streamToBuffer
};
