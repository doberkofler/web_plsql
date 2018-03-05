// @flow

/*
*	RequestError
*/

module.exports = class RequestError extends Error {
	timestamp: Date;

	constructor(message: string) {
		super(message);

		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, RequestError);
		}

		// Custom debugging information
		this.timestamp = new Date();
	}
};
