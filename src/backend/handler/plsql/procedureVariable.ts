/*
 *	Invoke the Oracle procedure and return the raw content of the page
 */

import debugModule from 'debug';
const debug = debugModule('webplsql:procedureVariable');

import {DB} from '../../util/db.ts';
import type {Request} from 'express';
import type {argObjType, BindParameterConfig} from '../../types.ts';

/**
 *	Get the sql statement and bindings for the procedure to execute for a variable number of arguments
 *	@param _req - The req object represents the HTTP request. (only used for debugging)
 *	@param procName - The procedure to execute
 *	@param argObj - The arguments to pass to the procedure
 *	@returns The SQL statement and bindings for the procedure to execute
 */
export const getProcedureVariable = (_req: Request, procName: string, argObj: argObjType): {sql: string; bind: BindParameterConfig} => {
	/* v8 ignore start */
	if (debug.enabled) {
		debug(`getProcedureVariable: ${procName} arguments=`, argObj);
	}
	/* v8 ignore stop */

	const names: string[] = [];
	const values: string[] = [];

	for (const key in argObj) {
		const value = argObj[key];
		if (typeof value === 'string') {
			names.push(key);
			values.push(value);
		} else if (Array.isArray(value)) {
			value.forEach((item) => {
				names.push(key);
				values.push(item);
			});
		}
	}

	return {
		sql: `${procName}(:argnames, :argvalues)`,
		bind: {
			argnames: {dir: DB.BIND_IN, type: DB.STRING, val: names},
			argvalues: {dir: DB.BIND_IN, type: DB.STRING, val: values},
		},
	};
};
