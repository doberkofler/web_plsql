/*
 *	Invoke the Oracle procedure and return the raw content of the page
 */

import debugModule from 'debug';
const debug = debugModule('webplsql:procedureVariable');

import {BIND_IN, STRING} from '../../util/oracledb-provider.ts';
import type {Request} from 'express';
import type {argObjType} from '../../types.ts';
import type {BindParameters} from 'oracledb';

/**
 *	Get the sql statement and bindings for the procedure to execute for a variable number of arguments
 *	@param _req - The req object represents the HTTP request. (only used for debugging)
 *	@param procName - The procedure to execute
 *	@param argObj - The arguments to pass to the procedure
 *	@returns The SQL statement and bindings for the procedure to execute
 */
export const getProcedureVariable = (_req: Request, procName: string, argObj: argObjType): {sql: string; bind: BindParameters} => {
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
			argnames: {dir: BIND_IN, type: STRING, val: names},
			argvalues: {dir: BIND_IN, type: STRING, val: values},
		},
	};
};
