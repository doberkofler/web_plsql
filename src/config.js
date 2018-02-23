// @flow

/*
*	Configuration
*/

const debug = require('debug')('web_plsql:config');

import type {oracleExpressMiddleware$options} from './index';

function validate(options: oracleExpressMiddleware$options) {
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

	if (typeof options.doctable !== 'string' || options.doctable.length === 0) {
		error('The option "doctable" must be of type string and cannot be empty');
	}
}

function error(err: string): void {
	console.error('web_plsql middleware usage error: ' + err);
	process.exit(1);
}

module.exports = {
	validate: validate
};
