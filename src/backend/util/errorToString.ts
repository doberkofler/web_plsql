import {inspect} from './trace.ts';

/**
 * Convert Error to a string.
 *
 * @param error - The error.
 * @returns The string representation.
 */
export const errorToString = (error: unknown): string => {
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
