// @flow

// $FlowFixMe
const errorPage = require('../lib/errorPage');
// $FlowFixMe
const RequestError = require('../lib/requestError');
// $FlowFixMe
const ProcedureError = require('../lib/procedureError');
const assert = require('chai').assert;

describe('errorPage', () => {
	let errorSave;

	before(() => {
		errorSave = console.error;
		// $FlowFixMe
		console.error = () => {};
	});

	after(() => {
		// $FlowFixMe
		console.error = errorSave;
	});

	let errorText = '';
	let errorHtml = '';

	const req = {};
	const res = {
		status() {
			return this;
		},
		send(error) {
			errorHtml = error;
			return this;
		}
	};
	const options = {};
	const trace = {
		write(error) {
			errorText = error;
		}
	};

	it('should report a "error message" in text and html format', () => {
		errorPage(req, res, options, trace, 'error message');

		assert.isTrue(/error message/.test(errorText), 'text: error message');
		assert.isTrue(/ERROR/.test(errorText), 'text: ERROR');
		assert.isTrue(/REQUEST/.test(errorText), 'text: REQUEST');
		assert.isTrue(/error message/.test(errorHtml), 'html: error message');
		assert.isTrue(/TIMESTAMP/.test(errorHtml), 'html: TIMESTAMP');
		assert.isTrue(/ERROR/.test(errorHtml), 'html: ERROR');
	});

	it('should report a "Error" in text and html format', () => {
		errorPage(req, res, options, trace, new Error('throw Error'));

		assert.isTrue(/throw Error/.test(errorText), 'text: exception message');
		assert.isTrue(/ERROR/.test(errorText), 'text: ERROR');
		assert.isTrue(/REQUEST/.test(errorText), 'text: REQUEST');
		assert.isTrue(/throw Error/.test(errorHtml), 'html: exception message');
		assert.isTrue(/TIMESTAMP/.test(errorHtml), 'html: TIMESTAMP');
		assert.isTrue(/ERROR/.test(errorHtml), 'html: ERROR');
	});

	it('should report a "RequestError" in text and html format', () => {
		errorPage(req, res, options, trace, new RequestError('throw RequestError'));

		assert.isTrue(/throw RequestError/.test(errorText), 'text: exception message');
		assert.isTrue(/ERROR/.test(errorText), 'text: ERROR');
		assert.isTrue(/REQUEST/.test(errorText), 'text: REQUEST');
		assert.isTrue(/throw RequestError/.test(errorHtml), 'html: exception message');
		assert.isTrue(/TIMESTAMP/.test(errorHtml), 'html: TIMESTAMP');
		assert.isTrue(/ERROR/.test(errorHtml), 'html: ERROR');
	});

	it('should report a "ProcedureError" in text and html format', () => {
		const environment = {dad: 'dad'};
		const sql = 'sql';
		const bind = {p1: '1'};

		errorPage(req, res, options, trace, new ProcedureError('throw ProcedureError', environment, sql, bind));

		assert.isTrue(/throw ProcedureError/.test(errorText), 'text: exception message');
		assert.isTrue(/ERROR/.test(errorText), 'text: ERROR');
		assert.isTrue(/REQUEST/.test(errorText), 'text: REQUEST');
		assert.isTrue(/PROCEDURE/.test(errorText), 'text: PROCEDURE');
		assert.isTrue(/ENVIRONMENT/.test(errorText), 'text: ENVIRONMENT');
		assert.isTrue(/throw ProcedureError/.test(errorHtml), 'html: exception message');
		assert.isTrue(/TIMESTAMP/.test(errorHtml), 'html: TIMESTAMP');
		assert.isTrue(/ERROR/.test(errorHtml), 'html: ERROR');
		assert.isTrue(/PROCEDURE/.test(errorHtml), 'html: REQUEST');
		assert.isTrue(/ENVIRONMENT/.test(errorHtml), 'text: ENVIRONMENT');
	});
});
