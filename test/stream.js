// @flow

// $FlowFixMe
const stream = require('../lib/stream');
const assert = require('chai').assert;
const fs = require('fs');

describe('stream', () => {
	it('should convert a stream to a buffer', async () => {
		const buffer = Buffer.from('Hey there', 'utf8');

		const filename = 'file.tmp';
		const file = fs.openSync(filename, 'w+');
		fs.writeSync(file, buffer, 0, buffer.length, 0);
		fs.closeSync(file);

		const readStream = fs.createReadStream('file.tmp');
		const readBuffer = await stream.streamToBuffer(readStream);

		assert.isTrue(buffer.equals(readBuffer));

		fs.unlinkSync(filename);
	});
});
