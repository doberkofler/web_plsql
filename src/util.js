import fs from 'node:fs';

/**
 * Is this a directory.
 * @param {unknown} directoryPath - Directory name.
 * @returns {boolean} - Return true if it is a directory.
 */
export const isDirectory = (directoryPath) => {
	if (typeof directoryPath !== 'string') {
		return false;
	}

	const stats = fs.statSync(directoryPath);

	return stats.isDirectory();
};

/**
 * Write to stdout.
 * @param {string} text - text to write.
 * @returns {void}
 */
export const write = (text) => {
	process.stdout.write(text);
};

/**
 * Write to stdout with new line.
 * @param {string} text - text to write.
 * @returns {void}
 */
export const writeNewLine = (text = '') => {
	process.stdout.write(`${text}\n`);
};

/**
 * Write to stdout after erasing line.
 * @param {string} text - text to write.
 * @returns {void}
 */
export const writeAfterEraseLine = (text) => {
	process.stdout.clearLine(0);
	process.stdout.cursorTo(0);
	process.stdout.write(text);
};

/**
 * Write to stdout starting a column.
 * @param {string} text - text to write.
 * @param {number} column - column.
 * @returns {void}
 */
export const writeStartingOnColumn = (text, column) => {
	process.stdout.cursorTo(column);
	process.stdout.clearLine(1);
	process.stdout.write(text);
};
