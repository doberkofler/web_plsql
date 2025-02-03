/*
 *	Configuration
 */

/**
 * @typedef {import('./types.js').environmentType} environmentType
 * @typedef {import('./types.js').middlewareOptions} middlewareOptions
 */

/**
 * Validation the configuration options.
 *
 * @param {Partial<middlewareOptions>} options - The configuration options.
 * @returns {middlewareOptions} - The validated configuration options.
 */
export const validate = (options) => {
	/** @type {middlewareOptions} */
	const validOptions = {
		doctable: '',
		errorStyle: 'basic',
	};

	if (typeof options !== 'undefined') {
		if (typeof options !== 'object' || options === null) {
			throw new TypeError('Invalid configuration object was given');
		}
		Object.keys(options).forEach((option) => {
			if (!['defaultPage', 'doctable', 'cgi', 'pathAlias', 'errorStyle', 'trace'].includes(option)) {
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
		if (typeof options.cgi !== 'object' || options.cgi === null) {
			throw new TypeError('The option "cgi" must be an object where all keys and values are of type string');
		}

		/** @type {Record<string, string>} */
		const cgi = {};
		for (const key in options.cgi) {
			if (typeof key === 'string' && typeof options.cgi[key] === 'string') {
				cgi[key] = options.cgi[key];
			} else {
				throw new TypeError('The option "cgi" must be an object where all keys and values are of type string');
			}
		}
		validOptions.cgi = cgi;
	}

	if (typeof options.pathAlias !== 'undefined') {
		if (
			typeof options.pathAlias === 'object' &&
			typeof options.pathAlias.alias === 'string' &&
			options.pathAlias.alias.length > 0 &&
			typeof options.pathAlias.procedure === 'string' &&
			options.pathAlias.procedure.length > 0
		) {
			validOptions.pathAlias = {
				alias: options.pathAlias.alias,
				procedure: options.pathAlias.procedure,
			};
		} else {
			throw new TypeError('The option "pathAlias" must be an object with the non-empty string properties "alias" and "procedure"');
		}
	}

	if (typeof options.errorStyle !== 'undefined') {
		if (typeof options.errorStyle !== 'string' || !['basic', 'debug'].includes(options.errorStyle)) {
			throw new TypeError('The optional option "errorStyle" must be "basic" or "debug"');
		} else {
			validOptions.errorStyle = options.errorStyle;
		}
	}

	return validOptions;
};
