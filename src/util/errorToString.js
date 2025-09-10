import {inspect} from './trace.js';

/**
 * Convert Error to a string.
 *
 * @param {unknown} error - The error.
 * @returns {string} The string representation.
 */
export const errorToString = (error) => {
	if (typeof error === 'string') {
		return error;
	} else if (error instanceof Error) {
		const parts = [error.name];
		if (typeof error.message === 'string' && error.message.length > 0) {
			parts.push(error.message);
		}
		if (typeof error.stack === 'string' && error.stack.length > 0) {
			parts.push(error.stack);
		}
		return parts.join('\n');
	} else {
		return inspect(error);
	}
};
