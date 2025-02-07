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
