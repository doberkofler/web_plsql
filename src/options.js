import path from 'node:path';
import {isDirectory} from './util.js';
import {getPackageVersion} from './version.js';
import {Command} from 'commander';

/**
 * @typedef {import('./types.js').errorStyleType} errorStyleType
 * @typedef {import('./types.js').pathAliasType} pathAliasType
 * @typedef {import('./types.js').configType} configType
 */

/**
 * Get option "string".
 * @param {Command} command - Command instance.
 * @param {string} name - Option name.
 * @returns {string} - Value.
 */
const getOptionString = (command, name) => {
	const value = /** @type {unknown} */ (command.opts()[name]);

	return typeof value === 'string' ? value : '';
};

/**
 * Get option "boolean".
 * @param {Command} command - Command instance.
 * @param {string} name - Option name.
 * @returns {boolean} - Value.
 */
const getOptionBoolean = (command, name) => {
	const value = /** @type {unknown} */ (command.opts()[name]);

	return typeof value === 'boolean' ? value : false;
};

/**
 * Get option "integer".
 * @param {Command} command - Command instance.
 * @param {string} name - Option name.
 * @returns {number} - Value.
 */
const getOptionInteger = (command, name) => {
	const value = /** @type {unknown} */ (command.opts()[name]);

	const integerValue = parseInt(typeof value === 'string' ? value : '', 10);

	if (isNaN(integerValue) || integerValue < 1 || integerValue > 65535) {
		return command.error(`Option "--${name}" must be an integer`);
	}

	return integerValue;
};

/**
 * Get option "dir".
 * @param {Command} command - Command instance.
 * @param {string} name - Option name.
 * @returns {Promise<string>} - Value.
 */
const getOptionDir = async (command, name) => {
	const value = /** @type {unknown} */ (command.opts()[name]);

	if (await isDirectory(value)) {
		return path.resolve(/** @type {string} */ (value));
	}

	return command.error(`Option "--${name}" must be an existing directory`);
};

/**
 * Get option "errorStyle".
 * @param {Command} command - Command instance.
 * @param {string} name - Option name.
 * @returns {errorStyleType} - Value.
 */
const getOptionErrorStyle = (command, name) => {
	const value = /** @type {unknown} */ (command.opts()[name]);

	if (value === 'basic' || value === 'debug') {
		return value;
	}

	return command.error(`Option "--${name}" must be "basic" or "debug"`);
};

/**
 * Get option "errorStyle".
 * @param {Command} command - Command instance.
 * @param {string} name - Option name.
 * @returns {pathAliasType | undefined} - Value.
 */
const getOptionPathAlias = (command, name) => {
	const value = /** @type {unknown} */ (command.opts()[name]);

	if (typeof value === 'string') {
		if (value.length === 0) {
			return;
		}
		const parts = value.split(':');
		if (parts.length === 2) {
			return {
				alias: parts[0],
				procedure: parts[1],
			};
		}
	}

	return command.error(`Option "--${name}" must be a string in the format "<alias>:<procedure>"`);
};

/**
 * Validates and parses command line arguments.
 * @returns {Promise<configType>} - Configuration.
 */
export const getOptions = async () => {
	const command = new Command();
	command.name('server');
	command.description('Oracle PL/SQL server');
	command.version(getPackageVersion());
	command.option('--port [integer]', 'Port to use. If 0, look for open port.', '0');
	command.option('--route-app [string]', 'Application route.', '/');
	command.option('--route-static [string]', 'Static files route.', '/static');
	command.option('--route-static-path [string]', 'Static files path.', '/static');
	command.option('--user [string]', 'Oracle database user', process.env.ORACLE_USER ?? '');
	command.option('--password [string]', 'Oracle database password', process.env.ORACLE_PASSWORD ?? '');
	command.option('--server [string]', 'Oracle database connect string', process.env.ORACLE_SERVER ?? '');
	command.option('--default-page [string]', 'Default page', '');
	command.option('--path-alias [string]', 'Path alias', '');
	command.option('--document-table [string]', 'Oracle document table', '');
	command.option('--error-style [string]', 'Error style (basic or debug)', 'basic');
	command.option('--logger-filename', 'Filename of the request logger or empty for no logging', 'access.log');
	command.option('--monitor-console', 'Enable console status monitor', false);
	command.parse();

	/** @type {configType} */
	const config = {
		port: getOptionInteger(command, 'port'),
		routeApp: getOptionString(command, 'routeApp'),
		routeStatic: getOptionString(command, 'routeStatic'),
		routeStaticPath: await getOptionDir(command, 'routeStaticPath'),
		user: getOptionString(command, 'user'),
		password: getOptionString(command, 'password'),
		connectString: getOptionString(command, 'server'),
		defaultPage: getOptionString(command, 'defaultPage'),
		pathAlias: getOptionPathAlias(command, 'pathAlias'),
		documentTable: getOptionString(command, 'documentTable'),
		errorStyle: getOptionErrorStyle(command, 'errorStyle'),
		loggerFilename: getOptionString(command, 'loggerFilename'),
		monitorConsole: getOptionBoolean(command, 'monitorConsole'),
	};

	return config;
};
