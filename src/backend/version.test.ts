import {assert, describe, it} from 'vitest';
import {getVersion} from './version.ts';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';

describe('version', () => {
	it('must match package', () => {
		const __dirname = dirname(fileURLToPath(import.meta.url));
		const json = readFileSync(join(__dirname, '../../package.json'), 'utf8');
		const {version} = JSON.parse(json) as {version: string};
		assert.strictEqual(getVersion(), version);
	});
});
