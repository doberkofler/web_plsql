/*
 *	RequestError
 */

/**
 * @typedef {import('./types.js').environmentType} environmentType
 * @typedef {import('./types.js').BindParameterConfig} BindParameterConfig
 */

export class ProcedureError extends Error {
	/** @type {Date} */
	timestamp;
	/** @type {environmentType} */
	environment;
	/** @type {string} */
	sql;
	/** @type {BindParameterConfig} */
	bind;

	/**
	 * @param {string} message - The error message.
	 * @param {environmentType} environment - The environment.
	 * @param {string} sql - The SQL to execute.
	 * @param {BindParameterConfig} bind - The bind parameters.
	 */
	constructor(message, environment, sql, bind) {
		super(message);

		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, ProcedureError);
		}

		// Custom debugging information
		this.timestamp = new Date();
		this.environment = environment;
		this.sql = sql;
		this.bind = bind;
	}
}
