import util from 'node:util';
import path from 'node:path';
import express from 'express';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import * as oracledb from './mock/oracledb.js';
import {handlerWebPlSql} from '../src/handlerPlSql.js';

const PORT = 8765;
const DOC_TABLE = 'docTable';
export const PATH = '/base';
export const DEFAULT_PAGE = 'sample.pageIndex';

/**
 * @typedef {import('../src/types.js').BindParameterConfig} BindParameterConfig
 * @typedef {import('../src/types.js').configPlSqlHandlerType} configPlSqlHandlerType
 * @typedef {{name: string, value: string | string[]}[]} paraType
 */

/**
 * File upload metadata
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
			console.error(`===> The parameter "${para.name}" is missing`);
			return false;
		}

		if (Array.isArray(para.value)) {
			return para.value.every((v, i) => {
				const equal = v === bind[`p_${para.name}`].val[i];
				if (!equal) {
					console.error(`===> The value "${v}" of parameter "${para.name}" is different`);
				}
				return equal;
			});
		}

		return para.value === bind[`p_${para.name}`].val;
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
		console.error('===> Invalid number of parameters');
		return false;
	}

	if (!parameters.every((para) => ['argnames', 'argvalues'].includes(para.name))) {
		console.error('===> Invalid parameter names');
		return false;
	}

	if (!('argnames' in bind) || !('argvalues' in bind)) {
		console.error('===> Missing bindings');
		return false;
	}

	return parameters.every((para) => Array.isArray(para.value) && arrayEqual(para.value, bind[para.name].val));
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
 *	Start server
 *	@param {boolean} [log] - Log requests.
 *	@returns {Promise<serverConfigType>} - The server configuration
 */
export const serverStart = async (log = false) => {
	const connectionPool = await oracledb.createPool({
		user: 'sample',
		password: 'sample',
		connectString: 'localhost:1521/TEST',
	});

	// create the upload middleware
	const upload = multer({
		storage: multer.diskStorage({
			destination: '/tmp/uploads',
			filename: (req, file, cb) => {
				const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
				cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
			},
		}),
		limits: {
			fileSize: 50 * 1024 * 1024, // 50MB limit
		},
	});

	// create express app
	const app = express();

	// log to stdout
	if (log) {
		app.use(morgan('dev'));
	}

	// add middleware
	app.use(upload.any());
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(cookieParser());
	app.use(compression());

	// add the oracle pl/sql express middleware
	/** @type {configPlSqlHandlerType} */
	const options = {
		defaultPage: DEFAULT_PAGE,
		pathAlias: 'alias',
		pathAliasProcedure: 'pathAlias',
		documentTable: DOC_TABLE,
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
 *	@param {{proc: string; para?: paraType; lines: string[]}} config - The configuration.
 */
export const sqlExecuteProxy = (config) => {
	/**
	 *	Proxy for the next sql procedure to be executed
	 *	@param {string} sql - The SQL statement.
	 *	@param {BindParameterConfig} bindParams - The bind object.
	 *	@returns {unknown}
	 */
	const sqlExecuteProxyCallback = (sql, bindParams) => {
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

		if (sql.toLowerCase().includes(config.proc.toLowerCase())) {
			if (typeof config.para !== 'undefined') {
				if (!parameterEqual(sql, bindParams, config.para)) {
					console.error(`===> Parameter mismatch\n${'-'.repeat(30)}\n${util.inspect(bindParams)}\n${'-'.repeat(30)}`);
					return {};
				}
			}

			return {
				outBinds: {
					fileType: null,
					fileSize: null,
					fileBlob: null,
					fileExist: 0,
					lines: config.lines,
					irows: config.lines.length,
				},
			};
		}

		if (sql.toLowerCase().startsWith('insert into')) {
			return {
				rowsAffected: 1,
			};
		}

		console.error(`===> sql statement cannot be identified\n${'-'.repeat(30)}\n${sql}\n${'-'.repeat(30)}`);

		return {};
	};

	// @ts-expect-error FIXME: do not understand!
	oracledb.setExecuteCallback(sqlExecuteProxyCallback);
};
