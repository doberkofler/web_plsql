import {assert} from 'chai';
import {streamToBuffer} from '../src/stream';
import fs from 'fs';

describe('stream', () => {
	it('should convert a stream to a buffer', async () => {
		const buffer = Buffer.from('Hey there', 'utf8');

		const filename = 'file.tmp';
		const file = fs.openSync(filename, 'w+');
		fs.writeSync(file, buffer, 0, buffer.length, 0);
		fs.closeSync(file);

		const readStream = fs.createReadStream('file.tmp');
		const readBuffer = await streamToBuffer(readStream);

		assert.isTrue(buffer.equals(readBuffer));

		fs.unlinkSync(filename);
	});
});
