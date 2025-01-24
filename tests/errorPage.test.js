import assert from 'node:assert';
import {describe, it, before, after} from 'node:test';
import {errorPage} from '../src/errorPage.js';
import {RequestError} from '../src/requestError.js';
import {ProcedureError} from '../src/procedureError.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('../src/types.js').BindParameterConfig} BindParameterConfig
 * @typedef {import('../src/types.js').middlewareOptions} middlewareOptions
 * @typedef {import('../src/trace.js').Trace} Trace
 */

describe('errorPage', () => {
	let errorSave = console.error;

	before(() => {
		errorSave = console.error;
		console.error = () => {}; // eslint-disable-line @typescript-eslint/no-empty-function
	});

	after(() => {
		console.error = errorSave;
	});

	let errorText = '';
	let errorHtml = '';

	/** @type {middlewareOptions} */
	const options = {
		errorStyle: 'debug',
		trace: 'off',
	};

	const req = /** @type {Request} */ ({});
	const res = /** @type {Response} */ (
		/** @type {unknown} */ ({
			status() {
				return this;
			},
			send(/** @type {string} */ error) {
				errorHtml = error;
				return this;
			},
		})
	);

	const trace = /** @type {Trace} */ ({
		write(error) {
			errorText = error;
		},
	});

	it('should report a "error message" in text and html format', () => {
		errorPage(req, res, options, trace, new Error('error message'));

		assert.strictEqual(errorText.includes('error message'), true);
		assert.strictEqual(errorText.includes('ERROR'), true);
		assert.strictEqual(errorText.includes('REQUEST'), true);
		assert.strictEqual(errorHtml.includes('error message'), true);
		assert.strictEqual(errorHtml.includes('TIMESTAMP'), true);
		assert.strictEqual(errorHtml.includes('ERROR'), true);
	});

	it('should report a "Error" in text and html format', () => {
		errorPage(req, res, options, trace, new Error('throw Error'));

		assert.strictEqual(errorText.includes('throw Error'), true);
		assert.strictEqual(errorText.includes('ERROR'), true);
		assert.strictEqual(errorText.includes('REQUEST'), true);
		assert.strictEqual(errorHtml.includes('throw Error'), true);
		assert.strictEqual(errorHtml.includes('TIMESTAMP'), true);
		assert.strictEqual(errorHtml.includes('ERROR'), true);
	});

	it('should report a "RequestError" in text and html format', () => {
		errorPage(req, res, options, trace, new RequestError('throw RequestError'));

		assert.strictEqual(errorText.includes('throw RequestError'), true);
		assert.strictEqual(errorText.includes('ERROR'), true);
		assert.strictEqual(errorText.includes('REQUEST'), true);
		assert.strictEqual(errorHtml.includes('throw RequestError'), true);
		assert.strictEqual(errorHtml.includes('TIMESTAMP'), true);
		assert.strictEqual(errorHtml.includes('ERROR'), true);
	});

	it('should report a "ProcedureError" in text and html format', () => {
		const environment = {dad: 'dad'};
		const sql = 'sql';
		const bind = /** @type {BindParameterConfig} */ ({p1: '1'});

		errorPage(req, res, options, trace, new ProcedureError('throw ProcedureError', environment, sql, bind));

		assert.strictEqual(errorText.includes('throw ProcedureError'), true);
		assert.strictEqual(errorText.includes('ERROR'), true);
		assert.strictEqual(errorText.includes('REQUEST'), true);
		assert.strictEqual(errorText.includes('PROCEDURE'), true);
		assert.strictEqual(errorText.includes('ENVIRONMENT'), true);
		assert.strictEqual(errorHtml.includes('throw ProcedureError'), true);
		assert.strictEqual(errorHtml.includes('TIMESTAMP'), true);
		assert.strictEqual(errorHtml.includes('ERROR'), true);
		assert.strictEqual(errorHtml.includes('PROCEDURE'), true);
		assert.strictEqual(errorHtml.includes('ENVIRONMENT'), true);
	});

	it('should only report a "404" error when in basic mode', () => {
		options.errorStyle = 'basic';
		errorPage(req, res, options, trace, new Error('error message'));

		assert.strictEqual(errorText.includes('error message'), true);
	});
});
