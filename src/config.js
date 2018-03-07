// @flow

/*
*	Configuration
*/

const debug = require('debug')('web_plsql:config');

import type {environmentType} from './cgi';
export type oracleExpressMiddleware$options = {
	oracleUser: string,
	oraclePassword: string,
	oracleConnection: string,
	defaultPage?: string,
	doctable?: string,
	cgi?: environmentType,
	trace?: boolean,
	traceDirectory?: string
};

/**
* Validation the configuration options.
*
* @param {Object} options - The configuration options.
*/
module.exports = function validate(options: oracleExpressMiddleware$options) {
	debug('validate', options);

	if (typeof options !== 'object') {
		error('No configuration object was given');
	}

	if (options.oracleUser && typeof options.oracleUser !== 'string') {
		error('The option "oracleUser" must be of type string');
	}

	if (options.oraclePassword && typeof options.oraclePassword !== 'string') {
		error('The option "oraclePassword" must be of type string');
	}

	if (options.oracleConnection && typeof options.oracleConnection !== 'string') {
		error('The option "oracleConnection" must be of type string');
	}

	if (typeof options.defaultPage !== 'undefined' && (typeof options.defaultPage !== 'string' || options.defaultPage.length === 0)) {
		error('The option "defaultPage" must be of type string and cannot be empty');
	}

	if (typeof options.doctable !== 'undefined' && (typeof options.doctable !== 'string' || options.doctable.length === 0)) {
		error('The option "doctable" must be of type string and cannot be empty');
	}

	if (typeof options.cgi === 'object') {
		if (!Object.keys(options.cgi).every(key => typeof key === 'string') || !Object.values(options.cgi).every(value => typeof value === 'string')) {
			error('The option "cgi" must be an object where all keys and values are of type string');
		}
	} else {
		options.cgi = {};
	}

	if (typeof options.trace !== 'undefined' && typeof options.trace !== 'boolean') {
		error('The option "trace" must be of type boolean');
	}

	if (typeof options.traceDirectory !== 'undefined' && typeof options.traceDirectory !== 'string') {
		error('The option "trace" must be of type string');
	}
};

function error(err: string): void {
	console.error('web_plsql middleware usage error: ' + err);
	process.exit(1);
}
