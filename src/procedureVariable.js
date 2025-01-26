/*
 *	Invoke the Oracle procedure and return the raw content of the page
 */

import debugModule from 'debug';
const debug = debugModule('webplsql:procedureVariable');

import oracledb from 'oracledb';

/**
 * @typedef {import('oracledb').Result<unknown>} Result
 * @typedef {import('./types.js').argObjType} argObjType
 * @typedef {import('./types.js').BindParameterConfig} BindParameterConfig
 */

/**
 * Get the sql statement and bindings for the procedure to execute for a variable number of arguments
 * @param {string} procedure - The procedure to execute
 * @param {argObjType} argObj - The arguments to pass to the procedure
 * @returns {{sql: string; bind: BindParameterConfig}} - The SQL statement and bindings for the procedure to execute
 */
export const getProcedureVariable = (procedure, argObj) => {
	debug(`getProcedureVariable: ${procedure} arguments=`, argObj);

	const names = [];
	const values = [];

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
		sql: `${procedure}(:argnames, :argvalues);`,
		bind: {
			argnames: {dir: oracledb.BIND_IN, type: oracledb.STRING, val: names},
			argvalues: {dir: oracledb.BIND_IN, type: oracledb.STRING, val: values},
		},
	};
};
