// @flow

/**
* Report a fatal error and exit process.
*
* @param {string} error - The error message.
* @param {number} code - The exit code.
*/
module.exports = function exit(error: string, code: number): void {
	console.error(error);
	process.exit(code);
};
