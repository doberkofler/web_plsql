import util from 'node:util';
import path from 'node:path';
import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import * as oracledb from './mock/oracledb.js';
import {handlerWebPlSql} from '../src/handler/plsql/handlerPlSql.js';
import {handlerUpload} from '../src/handler/handlerUpload.js';

const PORT = 8765;
const DOC_TABLE = 'docTable';
export const PATH = '/base';
export const DEFAULT_PAGE = 'sample.pageIndex';

/**
 * @typedef {import('../src/types.js').BindParameterConfig} BindParameterConfig
 * @typedef {import('../src/types.js').configPlSqlHandlerType} configPlSqlHandlerType
 * @typedef {import('../src/types.js').transactionModeType} transactionModeType
 * @typedef {{name: string, value: string | string[]}[]} paraType
 */

/**
 * Server configuration result type.
 * @typedef {object} serverConfigType
 * @property {import('express').Express} app
 * @property {import('node:http').Server} server
 * @property {oracledb.Pool} connectionPool
 */

/**
 * Compare parameters
 * @param {string} sql - The SQL statement.
 * @param {BindParameterConfig} bind - The bind object.
 * @param {paraType} parameters - The parameters.
 * @returns {boolean} - The result of the comparison.
 */
const parameterEqual = (sql, bind, parameters) =>
	!sql.includes('(:argnames, :argvalues)') ? parameterFixedEqual(bind, parameters) : parameterFlexibleEqual(bind, parameters);

/**
 * Compare parameters with fixed names
 * @param {BindParameterConfig} bind - The bind object.
 * @param {paraType} parameters - The parameters.
 * @returns {boolean} - The result of the comparison.
 */
const parameterFixedEqual = (bind, parameters) => {
	return parameters.every((para) => {
		if (!(`p_${para.name}` in bind)) {
			proxyError(`The parameter "${para.name}" is missing`);
			return false;
		}

		if (Array.isArray(para.value)) {
			return para.value.every((v, i) => {
				const paramBind = bind[`p_${para.name}`];
				const equal = paramBind ? v === paramBind.val[i] : false;
				if (!equal) {
					proxyError(`===> The value "${v}" of parameter "${para.name}" is different`);
				}
				return equal;
			});
		}

		const paramBind = bind[`p_${para.name}`];
		return paramBind ? para.value === paramBind.val : false;
	});
};

/**
 * Compare parameters with flexible names
 * @param {BindParameterConfig} bind - The bind object.
 * @param {paraType} parameters - The parameters.
 * @returns {boolean} - The result of the comparison.
 */
const parameterFlexibleEqual = (bind, parameters) => {
	if (parameters.length !== 2) {
		proxyError('===> Invalid number of parameters');
		return false;
	}

	if (!parameters.every((para) => ['argnames', 'argvalues'].includes(para.name))) {
		proxyError('===> Invalid parameter names');
		return false;
	}

	if (!('argnames' in bind) || !('argvalues' in bind)) {
		proxyError('===> Missing bindings');
		return false;
	}

	return parameters.every((para) => {
		const paramBind = bind[para.name];
		return Array.isArray(para.value) && paramBind && arrayEqual(para.value, paramBind.val);
	});
};

/**
 *	Compare two arrays
 *	@param {unknown[]} array1 - The first array.
 *	@param {unknown[]} array2 - The second array.
 *	@returns {boolean} - The result of the comparison.
 */
const arrayEqual = (array1, array2) => {
	if (!array1 || !array2) {
		return false;
	}

	if (array1.length !== array2.length) {
		return false;
	}

	return array1.every((e, i) => e === array2[i]);
};

/**
 *	Start server configuration options.
 *	@typedef configOptionsType
 *	@property {boolean} [log=false] - Enable request logging.
 *	@property {transactionModeType} [transactionMode] - Specifies an optional handler to be invoked before calling the requested procedure.
 */

/**
 *	Proxy error
 *	@param {string} title - Error title.
 *	@param {string} [description] - description title.
 *	@returns {void}
 */
const proxyError = (title, description) => {
	const separator = '*'.repeat(80);
	let text = `${separator}\n*\n* Server proxy: ${title}\n*\n${separator}`;
	if (description) {
		text += `\n${description}\n${separator}`;
	}

	console.error(text);
};

/**
 *	Start server
 *	@param {configOptionsType} [config] - Configuration.
 *	@returns {Promise<serverConfigType>} - The server configuration
 */
export const serverStart = async (config = {}) => {
	const {log = false, transactionMode} = config;
	const connectionPool = await oracledb.createPool({
		user: 'sample',
		password: 'sample',
		connectString: 'localhost:1521/TEST',
	});

	// create express app
	const app = express();

	// log to stdout
	if (log) {
		app.use(morgan('dev'));
	}

	// add middleware
	app.use(handlerUpload());
	app.use(express.json({limit: '50mb'}));
	app.use(express.urlencoded({limit: '50mb', extended: true}));
	app.use(cookieParser());
	app.use(compression());

	// add the oracle pl/sql express middleware
	/** @type {configPlSqlHandlerType} */
	const options = {
		defaultPage: DEFAULT_PAGE,
		pathAlias: 'alias',
		pathAliasProcedure: 'pathAlias',
		documentTable: DOC_TABLE,
		transactionMode,
		errorStyle: 'basic',
	};

	app.use([`${PATH}/:name`, PATH], handlerWebPlSql(/** @type {any} */ (connectionPool), options));

	// serving static files
	const staticResourcesPath = path.join(process.cwd(), 'tests', 'static');
	app.use('/static', express.static(staticResourcesPath));

	// listen
	return new Promise((resolve) => {
		const server = app.listen(PORT, () => {
			resolve({
				app,
				server,
				connectionPool,
			});
		});
	});
};

/**
 *	Stop server.
 *	@param {serverConfigType} config - The server configuration.
 */
export const serverStop = async (config) => {
	config.server.close();
	await config.connectionPool.close(0);
};

/**
 *	Set the proxy for the next sql procedure to be executed
 *	@param {{proc: string; para?: paraType; lines?: string[]; error?: string}} config - The configuration.
 */
export const sqlExecuteProxy = (config) => {
	/**
	 *	Proxy for the next sql procedure to be executed
	 *	@param {string} sql - The SQL statement.
	 *	@param {BindParameterConfig} bindParams - The bind object.
	 *	@returns {unknown}
	 */
	const sqlExecuteProxyCallback = (sql, bindParams) => {
		// New Check for Name Resolution (procedureSanitize.js)
		if (sql.toLowerCase().includes('dbms_utility.name_resolve') && bindParams && 'resolved' in bindParams) {
			// Extract the input name to return it as resolved (mocking success)
			// bindParams.name.val holds the input procedure name
			const nameVal = bindParams.name?.val;
			const procName = (typeof nameVal === 'string' ? nameVal : '').toLowerCase();
			return {
				outBinds: {
					resolved: procName,
				},
			};
		}

		if (sql.toLowerCase().includes('dbms_utility.name_resolve')) {
			/** @type {{outBinds: {names: string[], types: string[]}}} */
			const noPara = {
				outBinds: {
					names: [],
					types: [],
				},
			};

			return typeof config.para === 'undefined'
				? noPara
				: config.para.reduce((accumulator, currentValue) => {
						accumulator.outBinds.names.push(currentValue.name);
						accumulator.outBinds.types.push('VARCHAR2');
						return accumulator;
					}, noPara);
		}

		if (sql.toLowerCase().includes('dbms_session.modify_package_state')) {
			return;
		}

		// this is the proxy for the sql statement in the function "procedurePrepare" in "procedure.js"
		if (sql.toLowerCase().includes('dbms_session.modify_package_state') || sql.toLowerCase().includes('owa.init_cgi_env')) {
			return;
		}

		// this is the proxy for the sql statement in the function "procedureExecute" in "procedure.js"
		if (sql.toLowerCase().includes(config.proc.toLowerCase())) {
			// Simulate error if configured
			if (config.error) {
				throw new Error(config.error);
			}

			if (typeof config.para !== 'undefined') {
				if (!parameterEqual(sql, bindParams, config.para)) {
					proxyError('parameter mismatch', util.inspect(bindParams));
					return {};
				}
			}

			return;
		}

		// this is the proxy for the sql statement in the function "procedureGetPage" in "procedure.js"
		if (sql.toLowerCase().includes('owa.get_page(thepage=>:lines, irows=>:irows)')) {
			return {
				outBinds: {
					lines: config.lines ?? [],
					irows: config.lines ? config.lines.length : 0,
				},
			};
		}

		// this is the proxy for the sql statement in the function "procedureSownloadFiles" in "procedure.js"
		if (sql.toLowerCase().includes('wpg_docload.get_download_file')) {
			return {
				outBinds: {
					fileType: '',
					fileSize: 0,
					fileBlob: null,
				},
			};
		}

		if (sql.toLowerCase().startsWith('insert into')) {
			return {
				rowsAffected: 1,
			};
		}

		proxyError('the sql statement has no proxy', sql);
		process.exit(1);
	};

	// @ts-expect-error FIXME: do not understand!
	oracledb.setExecuteCallback(sqlExecuteProxyCallback);
};
