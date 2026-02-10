/*
 *	RequestError
 */

import type {environmentType, BindParameterConfig} from '../../types.ts';

export class ProcedureError extends Error {
	timestamp: Date;
	environment: environmentType;
	sql: string;
	bind: BindParameterConfig;

	/**
	 * @param message - The error message.
	 * @param environment - The environment.
	 * @param sql - The SQL to execute.
	 * @param bind - The bind parameters.
	 */
	constructor(message: string, environment: environmentType, sql: string, bind: BindParameterConfig) {
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
