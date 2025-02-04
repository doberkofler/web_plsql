import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {readFileSync} from 'node:fs';

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
	// Resolve __dirname equivalent in ESM.
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);

	// Build the path to package.json (adjust the relative path as necessary).
	const packageJsonPath = join(__dirname, '../package.json');

	// Synchronously read the file content.
	const fileContent = readFileSync(packageJsonPath, 'utf8');

	// Parse the JSON content.
	/** @type {PackageJSON} */
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const pkg = JSON.parse(fileContent);

	return typeof pkg.version === 'string' ? pkg.version : '';
};
