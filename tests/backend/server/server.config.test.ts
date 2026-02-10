import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {showConfig} from '../../../src/backend/server/config.ts';
import type {configType} from '../../../src/backend/types.ts';
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
		const config: configType = {
			port: 8080,
			adminRoute: '/admin',
			adminUser: 'admin',
			loggerFilename: 'access.log',
			uploadFileSizeLimit: 1024,
			routeStatic: [],
			routePlSql: [],
		};

		showConfig(config);

		expect(consoleLogSpy).toHaveBeenCalled();
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Server port:            8080'));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Admin route:            /admin (authenticated)'));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Access log:             access.log'));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Upload file size limit: 1024 bytes'));
	});

	it('should handle missing optional config fields', () => {
		const config: configType = {
			port: 3000,
			loggerFilename: '',
			routeStatic: [],
			routePlSql: [],
		};

		showConfig(config);

		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Server port:            3000'));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Admin route:            /admin'));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Access log:             '));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Upload file size limit: any'));
	});

	it('should show static routes', () => {
		const config: configType = {
			port: 8080,
			loggerFilename: '',
			routeStatic: [
				{route: '/static', directoryPath: '/var/www/static'},
				{route: '/images', directoryPath: '/var/www/images'},
			],
			routePlSql: [],
		};

		showConfig(config);

		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Static route:           /static'));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Directory path:         /var/www/static'));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Static route:           /images'));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Directory path:         /var/www/images'));
	});

	it('should show PL/SQL routes with string transactionMode', () => {
		const config: configType = {
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

		showConfig(config);

		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Route:                  http://localhost:8080/pls'));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Oracle user:            scott'));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('After request handler:  commit'));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Exclution list:         secret'));
	});

	it('should show PL/SQL routes with function transactionMode', () => {
		const config: configType = {
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
					transactionMode: 123 as any,
					errorStyle: 'basic',
				},
			],
		};

		showConfig(config);

		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('After request handler:  custom callback'));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('After request handler:  '));
	});
});
