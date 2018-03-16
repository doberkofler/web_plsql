// @flow

/*
*	Configuration
*/

import type {environmentType} from './cgi';
export type oracleExpressMiddleware$options = {
	defaultPage?: string,
	doctable?: string,
	cgi?: environmentType,
	trace: 'on' | 'off' | 'test'
};

/**
* Validation the configuration options.
*
* @param {Object} options - The configuration options.
* @returns {oracleExpressMiddleware$options} - The validated configuration options.
*/
module.exports = function validate(options: any): oracleExpressMiddleware$options {
	const validOptions: oracleExpressMiddleware$options = {
		trace: 'off'
	};

	if (typeof options !== 'object') {
		throw new TypeError('No configuration object was given');
	}

	if (typeof options.defaultPage !== 'undefined') {
		if (typeof options.defaultPage === 'string' || options.defaultPage.length > 0) {
			validOptions.defaultPage = options.defaultPage;
		} else {
			throw new TypeError('The option "defaultPage" must be of type string and cannot be empty');
		}
	}

	if (typeof options.doctable !== 'undefined') {
		if (typeof options.doctable === 'string' || options.doctable.length > 0) {
			validOptions.doctable = options.doctable;
		} else {
			throw new TypeError('The option "doctable" must be of type string and cannot be empty');
		}
	}

	if (typeof options.cgi !== 'undefined') {
		if (typeof options.cgi === 'object' && Object.keys(options.cgi).every(key => typeof key === 'string') && Object.values(options.cgi).every(value => typeof value === 'string')) {
			validOptions.cgi = Object.assign({}, options.cgi);
		} else {
			throw new TypeError('The option "cgi" must be an object where all keys and values are of type string');
		}
	}

	if (typeof options.trace !== 'undefined') {
		if (typeof options.trace !== 'string' || ['on', 'off', 'test'].indexOf(options.trace.toLowerCase()) === -1) {
			throw new TypeError('The optional option "trace" must be "on" or "off"');
		} else {
			validOptions.trace = options.trace.toLowerCase();
		}
	}

	return validOptions;
};
