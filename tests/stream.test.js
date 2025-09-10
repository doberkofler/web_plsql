import assert from 'node:assert';
import {describe, it} from 'node:test';
import fs from 'node:fs';
import {streamToBuffer} from '../src/handler/plsql/stream.js';

describe('stream', () => {
	it('should convert a stream to a buffer', async () => {
		const buffer = Buffer.from('Hey there', 'utf8');

		const filename = 'file.tmp';
		const file = fs.openSync(filename, 'w+');
		fs.writeSync(file, buffer, 0, buffer.length, 0);
		fs.closeSync(file);

		const readStream = fs.createReadStream('file.tmp');
		const readBuffer = await streamToBuffer(readStream);

		assert.strictEqual(buffer.equals(readBuffer), true);

		fs.unlinkSync(filename);
	});
});
