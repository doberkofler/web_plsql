import {describe, it, expect} from '@jest/globals';
import {validate} from '../../src/config';

describe('configuration options', () => {
	it('should allow the following options', () => {
		[
			undefined, // eslint-disable-line no-undefined
			{},
			{cgi: {fast: 'on'}},
			{pathAlias: {alias: 'r', procedure: 'p'}},
			{errorStyle: 'debug'}
		].forEach(options => {
			expect(typeof validate(options as unknown as Record<string, unknown>)).toBe('object');
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
		{config: {pathAlias: {alias: 'r', procedure: ''}}, error: 'The option "pathAlias" must be an object with the non-empty string properties "alias" and "procedure"'},
		{config: {errorStyle: ''}, error: 'The optional option "errorStyle" must be "basic" or "debug"'},
		{config: {errorStyle: 'on'}, error: 'The optional option "errorStyle" must be "basic" or "debug"'},
		{config: {trace: true}, error: 'The optional option "trace" must be "on" or "off"'},
		{config: {trace: ''}, error: 'The optional option "trace" must be "on" or "off"'},
		{config: {trace: 'enabled'}, error: 'The optional option "trace" must be "on" or "off"'},
	].forEach(test => {
		it(`should throw the exception "${test.error}"`, () => {
			expect(() => {
				validate(test.config as unknown as Record<string, unknown>);
			}).toThrow(test.error);
		});
	});
});
