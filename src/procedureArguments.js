/*
 *	Invoke the Oracle procedure and return the raw content of the page
 */

import debugModule from 'debug';
const debug = debugModule('webplsql:procedureArguments');

import oracledb from 'oracledb';
import {getVariableArguments} from './procedureArgumentsVariable.js';
import {getNamedArguments} from './procedureArgumentsNamed.js';
import {Trace} from './trace.js';

/**
 * @typedef {import('oracledb').Connection} Connection
 * @typedef {import('./types.js').argObjType} argObjType
 * @typedef {import('./types.js').environmentType} environmentType
 * @typedef {import('./types.js').middlewareOptions} middlewareOptions
 * @typedef {import('./types.js').BindParameterConfig} BindParameterConfig
 */

/**
 *	Get the procedure and arguments to execute
 *	@param {string} procedure - The procedure to execute
 *	@param {argObjType} argObj - The arguments to pass to the procedure
 *	@param {middlewareOptions} options - The options for the middleware
 *	@param {Connection} databaseConnection - The database connection
 *	@param {Trace} trace - The trace object
 *	@returns {Promise<{sql: string; bind: BindParameterConfig}>} - The SQL statement and bindings for the procedure to execute
 */
export const getProcedure = async (procedure, argObj, options, databaseConnection, trace) => {
	debug('getProcedure', procedure, argObj);

	if (options.pathAlias && options.pathAlias.alias === procedure) {
		trace.write(`getProcedure: path alias "${options.pathAlias.alias}" redirects to "${options.pathAlias.procedure}"`);
		return {
			sql: `${options.pathAlias.procedure}(p_path=>:p_path);`,
			bind: {
				p_path: {dir: oracledb.BIND_IN, type: oracledb.STRING, val: procedure},
			},
		};
	} else if (procedure.startsWith('!')) {
		trace.write('getProcedure: get variable arguments');
		return getVariableArguments(procedure, argObj);
	}

	trace.write('getProcedure: get named arguments');
	return await getNamedArguments(procedure, argObj, databaseConnection);
};
