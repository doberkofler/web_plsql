import {promises as fs, readFileSync} from 'node:fs';

/**
 * Read file.
 *
 * @param {string} filePath - File name.
 * @returns {string} The string.
 */
export const readFileSyncUtf8 = (filePath) => {
	try {
		return readFileSync(filePath, 'utf8');
	} catch (err) {
		/* istanbul ignore next */
		throw new Error(`Unable to read file "${filePath}"`);
	}
};

/**
 * Read file.
 *
 * @param {string} filePath - File name.
 * @returns {Promise<Buffer>} The buffer.
 */
export const readFile = (filePath) => {
	try {
		return fs.readFile(filePath);
	} catch (err) {
		/* istanbul ignore next */
		throw new Error(`Unable to read file "${filePath}"`);
	}
};

/**
 * Remove file.
 *
 * @param {string} filePath - File name.
 * @returns {Promise<void>}.
 */
export const removeFile = (filePath) => {
	try {
		return fs.unlink(filePath);
	} catch (err) {
		/* istanbul ignore next */
		throw new Error(`Unable to remove file "${filePath}"`);
	}
};

/**
 * Load a json file.
 *
 * @param {string} filePath - File name.
 * @returns {unknown} The json object.
 */
export const getJsonFile = (filePath) => {
	const fileContent = readFileSync(filePath, 'utf8');

	try {
		return JSON.parse(fileContent);
	} catch (err) {
		throw new Error(`Unable to load file "${filePath}"`);
	}
};

/**
 * Is this a directory.
 * @param {unknown} directoryPath - Directory name.
 * @returns {Promise<boolean>} - Return true if it is a directory.
 */
export const isDirectory = async (directoryPath) => {
	if (typeof directoryPath !== 'string') {
		return false;
	}

	const stats = await fs.stat(directoryPath);

	return stats.isDirectory();
};

/**
 * Is this a file.
 * @param {unknown} filePath - File name.
 * @returns {Promise<boolean>} - Return true if it is a file.
 */
export const isFile = async (filePath) => {
	if (typeof filePath !== 'string') {
		return false;
	}

	const stats = await fs.stat(filePath);

	return stats.isFile();
};
