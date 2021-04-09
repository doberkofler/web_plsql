/*
*	Configuration
*/

import {environmentType} from './cgi';
export type oracleExpressMiddleware$options = {
	defaultPage?: string;
	doctable?: string;
	cgi?: environmentType;
	pathAlias?: {
		alias: string;
		procedure: string;
	};
	errorStyle: 'basic' | 'debug';
	trace: 'on' | 'off' | 'test';
};

/**
* Validation the configuration options.
*
* @param {Object} options - The configuration options.
* @returns {oracleExpressMiddleware$options} - The validated configuration options.
*/
export function validate(options: Record<string, any>): oracleExpressMiddleware$options {
	const validOptions: oracleExpressMiddleware$options = {
		errorStyle: 'basic',
		trace: 'off'
	};

	if (typeof options !== 'undefined') {
		if (arguments.length !== 1 || typeof options !== 'object' || options === null) {
			throw new TypeError('Invalid configuration object was given');
		}
		Object.keys(options).forEach(option => {
			if (['defaultPage', 'doctable', 'cgi', 'pathAlias', 'errorStyle', 'trace'].indexOf(option) === -1) {
				throw new TypeError(`Invalid configuration options "${option}"`);
			}
		});
	} else {
		return validOptions;
	}

	if (typeof options.defaultPage !== 'undefined') {
		if (typeof options.defaultPage === 'string' && options.defaultPage.length > 0) {
			validOptions.defaultPage = options.defaultPage;
		} else {
			throw new TypeError('The option "defaultPage" must be of type string and cannot be empty');
		}
	}

	if (typeof options.doctable !== 'undefined') {
		if (typeof options.doctable === 'string' && options.doctable.length > 0) {
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

	if (typeof options.pathAlias !== 'undefined') {
		if (typeof options.pathAlias === 'object' &&
			typeof options.pathAlias.alias === 'string' && options.pathAlias.alias.length > 0 &&
			typeof options.pathAlias.procedure === 'string' && options.pathAlias.procedure.length > 0) {
			validOptions.pathAlias = {
				alias: options.pathAlias.alias,
				procedure: options.pathAlias.procedure
			};
		} else {
			throw new TypeError('The option "pathAlias" must be an object with the non-empty string properties "alias" and "procedure"');
		}
	}

	if (typeof options.errorStyle !== 'undefined') {
		if (typeof options.errorStyle !== 'string' || ['basic', 'debug'].indexOf(options.errorStyle) === -1) {
			throw new TypeError('The optional option "errorStyle" must be "basic" or "debug"');
		} else {
			validOptions.errorStyle = options.errorStyle as 'basic' | 'debug';
		}
	}

	if (typeof options.trace !== 'undefined') {
		if (typeof options.trace !== 'string' || ['on', 'off', 'test'].indexOf(options.trace.toLowerCase()) === -1) {
			throw new TypeError('The optional option "trace" must be "on" or "off"');
		} else {
			validOptions.trace = options.trace.toLowerCase() as 'on' | 'off' | 'test';
		}
	}

	return validOptions;
}
