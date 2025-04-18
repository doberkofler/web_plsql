import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {getJsonFile} from './file.js';

/**
 * @typedef {object} PackageJSON
 * @property {string} [version] - The package version.
 */

/**
 * Retrieves the version from package.json.
 *
 * @returns {string} The version number of the package.
 */
export const getPackageVersion = () => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	const packageJsonPath = join(__dirname, '../package.json');

	const pkg = /** @type {PackageJSON} */ (getJsonFile(packageJsonPath));

	return typeof pkg.version === 'string' ? pkg.version : '';
};

/**
 * Retrieves the express version from package.json.
 *
 * @returns {string} The version number of the package.
 */
export const getExpressVersion = () => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	const packageJsonPath = join(__dirname, '../node_modules/express/package.json');

	const pkg = /** @type {PackageJSON} */ (getJsonFile(packageJsonPath));

	return typeof pkg.version === 'string' ? pkg.version : '';
};
