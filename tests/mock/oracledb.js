/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * @typedef {import('../../src/types.js').BindParameterConfig} BindParameterConfig
 * @typedef {(sql: string, bindParams?: BindParameterConfig) => unknown} executeCallbackType
 */

/** @type {executeCallbackType | null} */
let _executeCallback = null;

/**
 * @param {executeCallbackType | null} callback
 * @return {void}
 */
export const setExecuteCallback = (callback = null) => {
	_executeCallback = callback;
};

export class Lob {
	/**
	 * Creates an instance of Lob.
	 * @param {number} type - The type of Lob.
	 */
	constructor(type) {
		/** @type {number} */
		this.type = type;
	}
	/**
	 * @return {Promise<void>}
	 */
	destroy() {
		return Promise.resolve();
	}
}

export class Pool {
	/**
	 * @return {Promise<Connection>}
	 */
	getConnection() {
		return Promise.resolve(new Connection());
	}

	/**
	 * @param {any} dummy
	 * @return {Promise<void>}
	 */
	close(dummy) {
		return Promise.resolve();
	}
}

export class Connection {
	/**
	 * @param {string} sql - The SQL to execute.
	 * @param {BindParameterConfig} [bindParams] - The bind parameters.
	 * @param {unknown} [options] - The options.
	 * @return {Promise<unknown>}
	 */
	execute(sql, bindParams, options) {
		return Promise.resolve(_executeCallback ? _executeCallback(sql, bindParams) : {});
	}

	/**
	 * @param {number} type - The type of Lob.
	 * @return {Promise<Lob>}
	 */
	createLob(type) {
		const lob = new Lob(type);
		return Promise.resolve(lob);
	}

	/**
	 * @return {Promise<void>}
	 */
	release() {
		return Promise.resolve();
	}
}

/**
 * @param {unknown} options
 * @returns {Promise<Pool>}
 */
export const createPool = (options) => {
	return Promise.resolve(new Pool());
};

export const BIND_IN = 1;
export const BIND_INOUT = 2;
export const BIND_OUT = 3;

export const STRING = 4;
export const NUMBER = 5;
export const DATE = 6;
export const CURSOR = 7;
export const BUFFER = 8;
export const CLOB = 9;
export const BLOB = 10;

export const poolMin = 1;
export const poolMax = 1;
export const poolIncrement = 1;
export const poolTimeout = 1;
export const prefetchRows = 1;
export const stmtCacheSize = 1;

export const version = 0;
export const oracleClientVersion = 0;
