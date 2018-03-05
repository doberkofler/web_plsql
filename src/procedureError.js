// @flow

/*
*	RequestError
*/

import type {environmentType} from './cgi';

module.exports = class ProcedureError extends Error {
	timestamp: Date;
	environment: environmentType;
	sql: string;
	bind: oracledb$bindingType;

	constructor(message: string, environment: environmentType, sql: string, bind: oracledb$bindingType) {
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
};
