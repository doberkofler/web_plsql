import {assert} from 'chai';
import {errorPage} from '../src/errorPage';
import {RequestError} from '../src/requestError';
import {ProcedureError} from '../src/procedureError';
import {oracleExpressMiddleware$options} from '../src/config';

describe('errorPage', () => {
	let errorSave: any;

	before(() => {
		errorSave = console.error;
		console.error = () => {}; // eslint-disable-line @typescript-eslint/no-empty-function
	});

	after(() => {
		console.error = errorSave;
	});

	let errorText = '';
	let errorHtml = '';

	const options: oracleExpressMiddleware$options = {
		errorStyle: 'debug',
		trace: 'off'
	};

	const req: any = {};
	const res: any = {
		status() {
			return this;
		},
		send(error: string) {
			errorHtml = error;
			return this;
		}
	};
	const trace: any = {
		write(error: string) {
			errorText = error;
		}
	};

	it('should report a "error message" in text and html format', () => {
		errorPage(req, res, options, trace, new Error('error message'));

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

	it('should only report a "404" error when in basic mode', () => {
		options.errorStyle = 'basic';
		errorPage(req, res, options, trace, new Error('error message'));

		assert.isTrue(/error message/.test(errorText), 'Page not found');
	});
});
