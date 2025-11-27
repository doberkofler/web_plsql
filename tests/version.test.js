import assert from 'node:assert';
import {describe, it} from 'node:test';
import {getVersion} from '../src/server/version.js';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';

describe('version', () => {
	it('must match package', () => {
		const __dirname = dirname(fileURLToPath(import.meta.url));
		const json = readFileSync(join(__dirname, '../package.json'), 'utf8');
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const {version} = JSON.parse(json);
		assert.strictEqual(getVersion(), version);
	});
});
