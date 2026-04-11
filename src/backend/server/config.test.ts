import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {showConfig} from '../server/config.ts';
import {z$configType, type configInputType} from '../types.ts';
import type {MockInstance} from 'vitest';

describe('server/config', () => {
	let consoleLogSpy: MockInstance;

	beforeEach(() => {
		// Use a temporary variable to narrow the type of console to include mock functions

		const consoleObj = console as any;
		consoleLogSpy = vi.spyOn(consoleObj, 'log').mockImplementation(() => {
			return undefined;
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should show basic configuration', () => {
		const config: configInputType = {
			port: 8080,
			adminRoute: '/admin',
			adminUser: 'admin',
			loggerFilename: 'access.log',
			uploadFileSizeLimit: 1024,
			routeStatic: [],
			routePlSql: [],
		};

		showConfig(z$configType.parse(config));

		expect(consoleLogSpy).toHaveBeenCalled();
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Server port:\s+8080/));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Admin route:\s+\/admin \(authenticated\)/));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Access log:\s+access\.log/));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Upload file size limit:\s+1024 bytes/));
	});

	it('should handle missing optional config fields', () => {
		const config: configInputType = {
			port: 3000,
			loggerFilename: '',
			routeStatic: [],
			routePlSql: [],
		};

		showConfig(z$configType.parse(config));

		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Server port:\s+3000/));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Admin route:\s+\/admin/));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Access log:\s+-/));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Upload file size limit:\s+-/));
	});

	it('should show static routes', () => {
		const config: configInputType = {
			port: 8080,
			loggerFilename: '',
			routeStatic: [
				{route: '/static', directoryPath: '/var/www/static'},
				{route: '/images', directoryPath: '/var/www/images'},
			],
			routePlSql: [],
		};

		showConfig(z$configType.parse(config));

		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Route:\s+\/static/));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Path:\s+\/var\/www\/static/));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Route:\s+\/images/));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Path:\s+\/var\/www\/images/));
	});

	it('should show PL/SQL routes with string transactionMode', () => {
		const config: configInputType = {
			port: 8080,
			loggerFilename: '',
			routeStatic: [],
			routePlSql: [
				{
					route: '/pls',
					user: 'scott',
					password: 'tiger',
					connectString: 'localhost/xe',
					documentTable: 'docs',
					defaultPage: 'home',
					pathAlias: '/alias',
					pathAliasProcedure: 'proc',
					exclusionList: ['secret'],
					requestValidationFunction: 'validate',
					transactionMode: 'commit' as const,
					errorStyle: 'basic',
				},
			],
		};

		showConfig(z$configType.parse(config));

		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Route:\s+http:\/\/localhost:8080\/pls/));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Oracle user:\s+scott/));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/After request handler:\s+commit/));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Exclution list:\s+secret/));
	});

	it('should show PL/SQL routes with function transactionMode', () => {
		const config: configInputType = {
			port: 8080,
			loggerFilename: '',
			routeStatic: [],
			routePlSql: [
				{
					route: '/pls',
					user: 'scott',
					password: 'tiger',
					connectString: 'localhost/xe',
					documentTable: 'docs',
					defaultPage: 'home',
					transactionMode: () => {
						return undefined;
					},
					errorStyle: 'basic',
				},
				{
					route: '/pls2',
					user: 'scott',
					password: 'tiger',
					connectString: 'localhost/xe',
					documentTable: 'docs',
					defaultPage: 'home',
					errorStyle: 'basic',
				},
			],
		};

		showConfig(z$configType.parse(config));

		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/After request handler:\s+custom callback/));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/After request handler:\s+-/));
	});
});