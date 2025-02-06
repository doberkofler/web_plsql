import {promises as fs, readFileSync} from 'node:fs';

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

/**
 * Write to stdout.
 * @param {string} text - text to write.
 * @returns {void}
 */
export const write = (text) => {
	if (process.stdout.isTTY) {
		process.stdout.write(text);
	}
};

/**
 * Write to stdout with new line.
 * @param {string} text - text to write.
 * @returns {void}
 */
export const writeNewLine = (text = '') => {
	if (process.stdout.isTTY) {
		process.stdout.write(`${text}\n`);
	}
};

/**
 * Write to stdout after erasing line.
 * @param {string} text - text to write.
 * @returns {void}
 */
export const writeAfterEraseLine = (text) => {
	if (process.stdout.isTTY) {
		process.stdout.clearLine(0);
		process.stdout.cursorTo(0);
		process.stdout.write(text);
	}
};

/**
 * Write to stdout starting a column.
 * @param {string} text - text to write.
 * @param {number} column - column.
 * @returns {void}
 */
export const writeStartingOnColumn = (text, column) => {
	if (process.stdout.isTTY) {
		process.stdout.cursorTo(column);
		process.stdout.clearLine(1);
		process.stdout.write(text);
	}
};
