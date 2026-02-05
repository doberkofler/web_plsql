#!/usr/bin/env node
import {readFileSync, writeFileSync} from 'node:fs';

/**
 * @param {unknown} value
 * @returns {{version: string}}
 */
function parsePackageJson(value) {
	if (typeof value === 'object' && value !== null && 'version' in value && typeof value.version === 'string') {
		return {version: value.version};
	}
	throw new Error('Invalid package.json: missing version string');
}

const pkg = parsePackageJson(JSON.parse(readFileSync('package.json', 'utf-8')));

const content = `/**
 * Returns the current library version
 * @returns {string} - Version.
 */
export const getVersion = () => '${pkg.version}';
`;

writeFileSync('src/version.js', content);
