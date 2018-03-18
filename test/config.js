// @flow

// $FlowFixMe
const validate = require('../lib/config');
const assert = require('chai').assert;

describe('configuration options', () => {
	it('should allow the following options', () => {
		[
			undefined, // eslint-disable-line no-undefined
			{},
			{cgi: {fast: 'on'}}
		].forEach(options => {
			assert.strictEqual(typeof validate(options), 'object', JSON.stringify(options));
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
		{config: {trace: true}, error: 'The optional option "trace" must be "on" or "off"'},
		{config: {trace: ''}, error: 'The optional option "trace" must be "on" or "off"'},
		{config: {trace: 'enabled'}, error: 'The optional option "trace" must be "on" or "off"'},
	].forEach(test => {
		it(`should throw the exception "${test.error}"`, () => {
			assert.throws(() => {
				validate(test.config);
			}, test.error);
		});
	});
});
