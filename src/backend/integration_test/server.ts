import util from 'node:util';
import path from 'node:path';
import express, {type Express} from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import {handlerWebPlSql} from '../handler/plsql/handlerPlSql.ts';
import {handlerUpload} from '../handler/handlerUpload.ts';
import type {Server} from 'node:http';
import {createPool, type Pool} from '../util/db.ts';
import {setExecuteCallback, type executeCallbackType} from '../util/db-mock.ts';
import type {BindParameterConfig, configPlSqlHandlerType, transactionModeType} from '../types.ts';
import type {IDbBindParameter} from '../util/db-types.ts';

// Enable mock oracle
process.env.MOCK_ORACLE = 'true';

export const PORT = 8765;
const DOC_TABLE = 'docTable';
export const PATH = '/base';
export const DEFAULT_PAGE = 'sample.pageIndex';

type paraType = {name: string; value: string | string[]}[];

/**
 * Server configuration result type.
 */
export type serverConfigType = {
	app: Express;
	server: Server;
	connectionPool: Pool;
};

type configOptionsType = {
	log?: boolean;
	transactionMode?: transactionModeType;
};

/**
 * Compare parameters
 * @param sql - The SQL statement.
 * @param bind - The bind object.
 * @param parameters - The parameters.
 * @returns The result of the comparison.
 */
const parameterEqual = (sql: string, bind: BindParameterConfig, parameters: paraType): boolean =>
	!sql.includes('(:argnames, :argvalues)') ? parameterFixedEqual(bind, parameters) : parameterFlexibleEqual(bind, parameters);

/**
 * Compare parameters with fixed names
 * @param bind - The bind object.
 * @param parameters - The parameters.
 * @returns The result of the comparison.
 */
const parameterFixedEqual = (bind: BindParameterConfig, parameters: paraType): boolean => {
	return parameters.every((para) => {
		if (!(`p_${para.name}` in bind)) {
			proxyError(`The parameter "${para.name}" is missing`);
			return false;
		}

		if (Array.isArray(para.value)) {
			return para.value.every((v, i) => {
				const paramBind = (bind as Record<string, IDbBindParameter>)[`p_${para.name}`];
				const val = paramBind?.val as unknown[];

				const equal = paramBind ? v === val[i] : false;
				if (!equal) {
					proxyError(`===> The value "${v}" of parameter "${para.name}" is different`);
				}
				return equal;
			});
		}

		const paramBind = (bind as Record<string, IDbBindParameter>)[`p_${para.name}`];
		return paramBind ? para.value === paramBind.val : false;
	});
};

/**
 * Compare parameters with flexible names
 * @param bind - The bind object.
 * @param parameters - The parameters.
 * @returns The result of the comparison.
 */
const parameterFlexibleEqual = (bind: BindParameterConfig, parameters: paraType): boolean => {
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
		const paramBind = bind[para.name] as IDbBindParameter;

		return Array.isArray(para.value) && paramBind && arrayEqual(para.value, paramBind.val as unknown[]);
	});
};

/**
 *	Compare two arrays
 *	@param array1 - The first array.
 *	@param array2 - The second array.
 *	@returns The result of the comparison.
 */
const arrayEqual = (array1: unknown[], array2: unknown[]): boolean => {
	if (!array1 || !array2) {
		return false;
	}

	if (array1.length !== array2.length) {
		return false;
	}

	return array1.every((e, i) => e === array2[i]);
};

/**
 *	Proxy error
 *	@param title - Error title.
 *	@param description - description title.
 */
const proxyError = (title: string, description?: string): void => {
	const separator = '*'.repeat(80);
	let text = `${separator}\n*\n* Server proxy: ${title}\n*\n${separator}`;
	if (description) {
		text += `\n${description}\n${separator}`;
	}

	console.error(text);
};

/**
 *	Start server
 *	@param config - Configuration.
 *	@returns The server configuration
 */
export const serverStart = async (config: configOptionsType = {}): Promise<serverConfigType> => {
	const {log = false, transactionMode} = config;
	const connectionPool = await createPool({
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
	const options: configPlSqlHandlerType = {
		defaultPage: DEFAULT_PAGE,
		pathAlias: 'alias',
		pathAliasProcedure: 'pathAlias',
		documentTable: DOC_TABLE,
		transactionMode,
		errorStyle: 'basic',
	};

	app.use([`${PATH}/:name`, PATH], handlerWebPlSql(connectionPool, options));

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
 *	@param config - The server configuration.
 */
export const serverStop = async (config: serverConfigType): Promise<void> => {
	config.server.close();
	await config.connectionPool.close(0);
};

/**
 *	Set the proxy for the next sql procedure to be executed
 *	@param config - The configuration.
 *	@param config.proc - The procedure name.
 *	@param config.para - The parameters.
 *	@param config.lines - The lines.
 *	@param config.error - The error.
 */
export const sqlExecuteProxy = (config: {proc: string; para?: paraType; lines?: string[]; error?: string}): void => {
	/**
	 *	Proxy for the next sql procedure to be executed
	 *	@param sql - The SQL statement.
	 *	@param bindParams - The bind parameters.
	 *	@returns The result.
	 */
	const sqlExecuteProxyCallback: executeCallbackType = (sql: string, bindParams?: BindParameterConfig) => {
		// New Check for Name Resolution (procedureSanitize.js)
		if (sql.toLowerCase().includes('dbms_utility.name_resolve') && bindParams && 'resolved' in bindParams) {
			// Extract the input name to return it as resolved (mocking success)
			// bindParams.name.val holds the input procedure name
			const nameParam = bindParams.name as IDbBindParameter;
			const nameVal: unknown = nameParam?.val;
			const procName = (typeof nameVal === 'string' ? nameVal : '').toLowerCase();
			return {
				outBinds: {
					resolved: procName,
				},
			};
		}

		if (sql.toLowerCase().includes('dbms_utility.name_resolve')) {
			const noPara = {
				outBinds: {
					names: [] as string[],
					types: [] as string[],
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
			return {};
		}

		// this is the proxy for the sql statement in the function "procedurePrepare" in "procedure.ts"
		if (sql.toLowerCase().includes('dbms_session.modify_package_state') || sql.toLowerCase().includes('owa.init_cgi_env')) {
			return {};
		}

		// this is the proxy for the sql statement in the function "procedureExecute" in "procedure.ts"
		if (sql.toLowerCase().includes(config.proc.toLowerCase())) {
			// Simulate error if configured
			if (config.error) {
				throw new Error(config.error);
			}

			if (typeof config.para !== 'undefined') {
				if (!parameterEqual(sql, bindParams ?? {}, config.para)) {
					proxyError('parameter mismatch', util.inspect(bindParams));
					return {};
				}
			}

			return {};
		}

		// this is the proxy for the sql statement in the function "procedureGetPage" in "procedure.ts"
		if (sql.toLowerCase().includes('owa.get_page(thepage=>:lines, irows=>:irows)')) {
			return {
				outBinds: {
					lines: config.lines ?? [],
					irows: config.lines ? config.lines.length : 0,
				},
			};
		}

		// this is the proxy for the sql statement in the function "procedureSownloadFiles" in "procedure.ts"
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

	setExecuteCallback(sqlExecuteProxyCallback);
};
