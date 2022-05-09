import {describe, beforeAll, afterAll, it, expect} from '@jest/globals';
import {errorPage} from '../../src/errorPage';
import {RequestError} from '../../src/requestError';
import {ProcedureError} from '../../src/procedureError';
import {oracleExpressMiddleware$options} from '../../src/config';

describe('errorPage', () => {
	let errorSave: any;

	beforeAll(() => {
		errorSave = console.error;
		console.error = () => {}; // eslint-disable-line @typescript-eslint/no-empty-function
	});

	afterAll(() => {
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

		expect(/error message/.test(errorText)).toBeTruthy();
		expect(/ERROR/.test(errorText)).toBeTruthy();
		expect(/REQUEST/.test(errorText)).toBeTruthy();
		expect(/error message/.test(errorHtml)).toBeTruthy();
		expect(/TIMESTAMP/.test(errorHtml)).toBeTruthy();
		expect(/ERROR/.test(errorHtml)).toBeTruthy();
	});

	it('should report a "Error" in text and html format', () => {
		errorPage(req, res, options, trace, new Error('throw Error'));

		expect(/throw Error/.test(errorText)).toBeTruthy();
		expect(/ERROR/.test(errorText)).toBeTruthy();
		expect(/REQUEST/.test(errorText)).toBeTruthy();
		expect(/throw Error/.test(errorHtml)).toBeTruthy();
		expect(/TIMESTAMP/.test(errorHtml)).toBeTruthy();
		expect(/ERROR/.test(errorHtml)).toBeTruthy();
	});

	it('should report a "RequestError" in text and html format', () => {
		errorPage(req, res, options, trace, new RequestError('throw RequestError'));

		expect(/throw RequestError/.test(errorText)).toBeTruthy();
		expect(/ERROR/.test(errorText)).toBeTruthy();
		expect(/REQUEST/.test(errorText)).toBeTruthy();
		expect(/throw RequestError/.test(errorHtml)).toBeTruthy();
		expect(/TIMESTAMP/.test(errorHtml)).toBeTruthy();
		expect(/ERROR/.test(errorHtml)).toBeTruthy();
	});

	it('should report a "ProcedureError" in text and html format', () => {
		const environment = {dad: 'dad'};
		const sql = 'sql';
		const bind = {p1: '1'};

		errorPage(req, res, options, trace, new ProcedureError('throw ProcedureError', environment, sql, bind));

		expect(/throw ProcedureError/.test(errorText)).toBeTruthy();
		expect(/ERROR/.test(errorText)).toBeTruthy();
		expect(/REQUEST/.test(errorText)).toBeTruthy();
		expect(/PROCEDURE/.test(errorText)).toBeTruthy();
		expect(/ENVIRONMENT/.test(errorText)).toBeTruthy();
		expect(/throw ProcedureError/.test(errorHtml)).toBeTruthy();
		expect(/TIMESTAMP/.test(errorHtml)).toBeTruthy();
		expect(/ERROR/.test(errorHtml)).toBeTruthy();
		expect(/PROCEDURE/.test(errorHtml)).toBeTruthy();
		expect(/ENVIRONMENT/.test(errorHtml)).toBeTruthy();
	});

	it('should only report a "404" error when in basic mode', () => {
		options.errorStyle = 'basic';
		errorPage(req, res, options, trace, new Error('error message'));

		expect(/error message/.test(errorText)).toBeTruthy();
	});
});
