/*
 *	RequestError
 */

export class RequestError extends Error {
	/** @type {Date} */
	timestamp;

	/**
	 * @param {string} message - The error message.
	 */
	constructor(message) {
		super(message);

		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, RequestError);
		}

		// Custom debugging information
		this.timestamp = new Date();
	}
}
