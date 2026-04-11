/*
 *	Error handling
 */

import {logToFile} from './trace.ts';
import {printError} from './printError.ts';
import {errorToString} from './errorToString.ts';
import {jsonLogger} from './jsonLogger.ts';

/**
 * Log an error.
 *
 * @param error - The error.
 */
export const logError = (error: unknown): void => {
	let message = '';

	// what type of Error did we receive
	if (error instanceof Error) {
		message = errorToString(error);
	} else {
		if (typeof error === 'string') {
			message = error;
		}
		/* v8 ignore start - unreachable code: creating Error without throwing */
		try {
			// oxlint-disable-next-line unicorn/error-message
			new Error();
		} catch (err) {
			message += errorToString(err);
		}
		/* v8 ignore stop */
	}

	// trace to file
	logToFile(message);

	// json log
	jsonLogger.log({
		timestamp: new Date().toISOString(),
		type: 'error',
		message,
	});

	// print error
	printError(message);
};