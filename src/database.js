// @flow

const debug = require('debug')('database');
const fs = require('fs');
const util = require('util');
const oracledb = require('oracledb');

type oracledb$connection = any;
type oracledb$connectionpool = {
	getConnection: () => Promise<oracledb$connection>
};

class Database {
	_connectionPool: oracledb$connectionpool | null;
	_connection: oracledb$connection | null;

	/**
	* Constructor
	*/
	constructor() {
		const that = this;

		that._connectionPool = null;
		that._connection = null;
	}

	/**
	* Get a non-pooled connection and return a promise.
	*
	* @param {string} user - The username
	* @param {string} password - The password
	* @param {string} connectString - The connect string
	* @returns {Promise<void>} Promise
	*/
	async open(user: string, password: string, connectString: string): Promise<void> {
		debug(`open: user="${user}" password="${password}" connectString="${connectString}"`);

		const that = this;
		const options = {
			user: user,
			password: password,
			connectString: connectString
		};

		// if we already have a connection poolo, just open a connection
		if (that._connectionPool !== null) {
			that._connection = await that._connectionPool.getConnection();
			return Promise.resolve();
		}

		that._connectionPool = await oracledb.createPool(options);
		that._connection = await that._connectionPool.getConnection();
		return Promise.resolve();
	}

	/**
	* Close connection and return a promise.
	*
	* @param {Object} connection - A node-oracledb connection
	* @returns {Promise<void>} Promise
	*/
	close(): Promise<void> {
		const that = this;

		debug('close');

		return that._connection !== null ? that._connection.release() : Promise.reject(new Error('the connection has not been opened'));
	}

	/**
	* Execute the code and return a promise.
	*
	* @param {string} sql - A sql statement
	* @param {Array<mixed>} bind - An object containing the bindings for the statement
	* @returns {Promise<void>} Promise
	*/
	execute(sql: string, bind: Array<mixed>): Promise<any> {
		const that = this;

		debug('execute');

		if (that._connection === null) {
			return Promise.reject(new Error('the connection has not been opened'));
		}

		return that._connection.execute(sql, bind);
	}

	/**
	* Load and install the scripts in the scripts given by an array of file names and return a promise.
	*
	* @param {Array<string>} scriptFileNames - An array of file names
	* @returns {Promise<void>} Promise
	*/
	installScripts(scriptFileNames: Array<string>): Promise<void> {
		const that = this;

		debug('installScripts', util.inspect(scriptFileNames, {showHidden: false, depth: null, colors: true}));

		return new Promise((resolve, reject) => {
			scriptFileNames.forEach(async (filename) => {
				debug(`Process file "${filename}"...`);

				try {
					const sqlScript = fs.readFileSync(filename, 'utf8');
					await that.execute(sqlScript, []);
				} catch (err) {
					reject(new Error(err));
				}
			});

			resolve();
		});
	}

	/**
	* Return the version of the node-oracledb library
	*
	* @returns {string} Version
	*/
	static getDriverVersion(): string {
		return versionAsString(oracledb.version);
	}

	/**
	* Return the version of the oracle client
	*
	* @returns {string} Version
	*/
	static getClientVersion(): string {
		return versionAsString(oracledb.oracleClientVersion);
	}

	/**
	* Return the version of the oracle server
	*
	* @param {Object} connection - A node-oracledb connection
	* @returns {string} Version
	*/
	getServerVersion(): string {
		const that = this;

		return that._connection ? versionAsString(that._connection.oracleServerVersion) : '';
	}
}

/**
*	Return a string representation of a version in numeric representation
*	For version a.b.c.d.e, this property gives the number: (100000000 * a) + (1000000 * b) + (10000 * c) + (100 * d) + e)
*	For version a.b.c, this property gives the number: (10000 * a) + (100 * b) + c)
*
* @param {number} numericVersion - A number representing a 3-part or 5-part Oracle version
* @returns {string} The string representation of the given version
*/
function versionAsString(numericVersion: number): string {
	const version = [];
	let n;

	if (typeof numericVersion !== 'number') {
		return '';
	}

	// This is the 5-part version
	if (numericVersion > 100000000) {
		n = Math.floor(numericVersion / 100000000);
		numericVersion = numericVersion - n * 100000000;
		version.push(n.toString());

		n = Math.floor(numericVersion / 1000000);
		numericVersion = numericVersion - n * 1000000;
		version.push(n.toString());
	}

	// This is the 3-part version
	n = Math.floor(numericVersion / 10000);
	numericVersion = numericVersion - n * 10000;
	version.push(n.toString());

	n = Math.floor(numericVersion / 100);
	numericVersion = numericVersion - n * 100;
	version.push(n.toString());

	version.push(numericVersion.toString());

	return version.join('.');
}

module.exports = Database;
