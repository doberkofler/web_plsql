import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {printBanner} from '../server/printBanner.ts';
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

		printBanner(z$configType.parse(config));

		expect(consoleLogSpy).toHaveBeenCalled();
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Port\s+8080/u));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Admin route\s+\/admin \(authenticated\)/u));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Access log\s+access\.log/u));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Upload limit\s+1024 bytes/u));
	});

	it('should handle missing optional config fields', () => {
		const config: configInputType = {
			port: 3000,
			loggerFilename: '',
			routeStatic: [],
			routePlSql: [],
		};

		printBanner(z$configType.parse(config));

		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Port\s+3000/u));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Admin route\s+\/admin/u));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Access log\s+/u));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Upload limit\s+/u));
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

		printBanner(z$configType.parse(config));

		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Static route #1  route\s+\/static/u));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Static route #1  path\s+\/var\/www\/static/u));

		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Static route #2  route\s+\/images/u));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Static route #2  path\s+\/var\/www\/images/u));
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

		printBanner(z$configType.parse(config));

		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/PL\/SQL route #1  route\s+\/pls/u));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/PL\/SQL route #1  Oracle user\s+scott/u));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/PL\/SQL route #1  exclusion list\s+secret/u));
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

		printBanner(z$configType.parse(config));

		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/PL\/SQL route #1  session mode\s+custom/u));
		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/PL\/SQL route #2  session mode\s+—/u));
	});

	it('keeps text columns aligned and separated', () => {
		const config: configInputType = {
			port: 8082,
			loggerFilename: '',
			routeStatic: [],
			routePlSql: [
				{
					route: '/pls',
					user: 'test',
					password: 'test',
					connectString: 'localhost:1521/TEST',
					documentTable: 'docs',
					defaultPage: 'test.page',
					errorStyle: 'debug',
				},
			],
		};

		printBanner(z$configType.parse(config));

		const firstCall = consoleLogSpy.mock.calls[0];
		const banner = firstCall ? firstCall[0] : undefined;
		expect(typeof banner).toBe('string');

		if (typeof banner !== 'string') {
			return;
		}

		expect(banner).toMatch(/PL\/SQL route #1  path alias proc\s+—/u);
		expect(banner).toMatch(/PL\/SQL route #1  route\s+\/pls/u);
		expect(banner).toMatch(/Admin console\s+http:\/\/localhost:8082\/admin/u);
		expect(banner).toMatch(/\/pls\s+http:\/\/localhost:8082\/pls/u);
	});
});