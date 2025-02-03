import assert from 'node:assert';
import {describe, it} from 'node:test';
import {validate} from '../src/middlewareOptions.js';

/**
 * @typedef {import('../src/types.js').middlewareOptions} middlewareOptions
 */

describe('configuration options', () => {
	it('should allow the following options', () => {
		[undefined, {}, {cgi: {fast: 'on'}}, {pathAlias: {alias: 'r', procedure: 'p'}}, {errorStyle: 'debug'}].forEach((options) => {
			assert.strictEqual(typeof validate(/** @type {Partial<middlewareOptions>} */ (options)), 'object');
		});
	});
});

describe('configuration errors', () => {
	[
		{config: null, error: 'Invalid configuration object was given'},
		{config: {invalid: ''}, error: 'Invalid configuration options "invalid"'},
		{config: {defaultPage: 1}, error: 'The option "defaultPage" must be of type string and cannot be empty'},
		{config: {defaultPage: ''}, error: 'The option "defaultPage" must be of type string and cannot be empty'},
		{config: {doctable: 1}, error: 'The option "doctable" must be of type string and cannot be empty'},
		{config: {doctable: ''}, error: 'The option "doctable" must be of type string and cannot be empty'},
		{config: {cgi: ''}, error: 'The option "cgi" must be an object where all keys and values are of type string'},
		{config: {cgi: {a: 1}}, error: 'The option "cgi" must be an object where all keys and values are of type string'},
		{
			config: {pathAlias: {alias: 'r', procedure: ''}},
			error: 'The option "pathAlias" must be an object with the non-empty string properties "alias" and "procedure"',
		},
		{config: {errorStyle: ''}, error: 'The optional option "errorStyle" must be "basic" or "debug"'},
		{config: {errorStyle: 'on'}, error: 'The optional option "errorStyle" must be "basic" or "debug"'},
	].forEach((test) => {
		it(`should throw the exception "${test.error}"`, () => {
			assert.throws(() => {
				validate(/** @type {Partial<middlewareOptions>} */ (test.config));
			}, TypeError(test.error));
		});
	});
});
