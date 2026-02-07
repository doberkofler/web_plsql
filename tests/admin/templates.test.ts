import {describe, it, expect} from 'vitest';
import {renderConfig} from '../../src/admin/js/templates/config.js';
import {poolCard} from '../../src/admin/js/templates/poolCard.js';
import {errorRow} from '../../src/admin/js/templates/errorRow.js';

describe('Admin Templates', () => {
	describe('renderConfig', () => {
		it('should render server section', () => {
			const result = renderConfig({port: 8080, adminRoute: '/admin'});
			expect(result).toContain('8080');
			expect(result).toContain('/admin');
		});

		it('should render upload size limit when number', () => {
			const result = renderConfig({uploadFileSizeLimit: 1024 * 1024}); // 1 MB
			expect(result).toContain('1.00 MB');
			expect(result).toContain('1,048,576 bytes');
		});

		it('should render default values for missing optional server config', () => {
			const result = renderConfig({}); // Port is undefined here
			expect(result).toContain('(Not authenticated)'); // adminUser
			expect(result).toContain('(None)'); // adminPassword
			expect(result).toContain('(Logging disabled)'); // loggerFilename
			expect(result).toContain('No limit'); // uploadFileSizeLimit
		});

		it('should render PL/SQL routes', () => {
			const result = renderConfig({
				routePlSql: [
					{
						route: '/plsql',
						user: 'scott',
						password: 'pwd',
						connectString: 'conn',
						defaultPage: 'home',
						documentTable: 'docs',
						errorStyle: 'debug',
						pathAlias: 'alias',
						pathAliasProcedure: 'proc',
						requestValidationFunction: 'valFunc',
						transactionMode: 'commit',
					},
				],
			});
			expect(result).toContain('/plsql');
			expect(result).toContain('scott');
			expect(result).toContain('pwd');
			expect(result).toContain('conn');
			expect(result).toContain('home');
			expect(result).toContain('docs');
			expect(result).toContain('debug');
			expect(result).toContain('alias');
			expect(result).toContain('proc');
			expect(result).toContain('valFunc');
			expect(result).toContain('commit');
		});

		it('should render PL/SQL routes with exclusion list', () => {
			const result = renderConfig({
				routePlSql: [{route: '/plsql', exclusionList: ['ex1', 'ex2']}],
			});
			expect(result).toContain('ex1, ex2');
		});

		it('should render PL/SQL routes with custom transaction mode', () => {
			const result = renderConfig({
				routePlSql: [
					{
						route: '/plsql',
						transactionMode: () => {
							return;
						},
					},
				],
			});
			expect(result).toContain('Custom');
		});

		it('should render PL/SQL routes with default transaction mode (undefined)', () => {
			const result = renderConfig({
				routePlSql: [{route: '/plsql'}],
			});
			expect(result).toContain('commit');
		});

		it('should render PL/SQL routes with missing optional fields', () => {
			const result = renderConfig({
				routePlSql: [{route: '/plsql'}],
			});
			expect(result).toContain('(Not set)'); // user, connectString
			expect(result).toContain('(None)'); // password, exclusionList, etc
			expect(result).toContain('index'); // defaultPage default
			expect(result).toContain('table'); // errorStyle default
		});

		it('should render static routes', () => {
			const result = renderConfig({
				routeStatic: [{route: '/static', directoryPath: '/path'}],
			});
			expect(result).toContain('/static');
			expect(result).toContain('/path');
		});

		it('should render static routes with missing directory path', () => {
			const result = renderConfig({
				routeStatic: [{route: '/static'}],
			});
			expect(result).toContain('(Not set)');
		});

		it('should render empty states', () => {
			const result = renderConfig({
				routePlSql: [],
				routeStatic: [],
			});
			expect(result).toContain('No PL/SQL routes configured');
			expect(result).toContain('No static routes configured');
		});
	});

	describe('poolCard', () => {
		it('should render pool card with stats', () => {
			const poolData = {
				name: 'main-pool',
				connectionsOpen: 10,
				connectionsInUse: 3,
				stats: {
					totalRequests: 1000,
					totalTimeouts: 5,
				},
			};

			const result = poolCard(poolData);
			expect(result).toContain('main-pool');
			expect(result).toContain('3 / 10');
			expect(result).toContain('1,000');
			expect(result).toContain('5');
		});

		it('should calculate utilization correctly', () => {
			const poolData = {
				name: 'main-pool',
				connectionsOpen: 10,
				connectionsInUse: 5, // 50% utilization
				stats: null,
			};

			const result = poolCard(poolData);
			expect(result).toContain('50%');
		});

		it('should handle null stats', () => {
			const poolData = {
				name: 'main-pool',
				connectionsOpen: 10,
				connectionsInUse: 2,
				stats: null,
			};

			const result = poolCard(poolData);
			expect(result).toContain('main-pool');
			expect(result).not.toContain('Requests');
		});
	});

	describe('errorRow', () => {
		it('should render error row with full data', () => {
			const errorData = {
				timestamp: '2024-01-01T12:00:00Z',
				message: 'Test error',
				req: {
					method: 'GET',
					url: '/test',
				},
				details: {
					fullMessage: 'Full error message here',
				},
			};

			const result = errorRow(errorData);
			expect(result).toContain('Test error');
			expect(result).toContain('GET');
			expect(result).toContain('/test');
			expect(result).toContain('Full error message here');
		});

		it('should handle missing optional fields', () => {
			const errorData = {
				timestamp: '2024-01-01T12:00:00Z',
				message: 'Test error',
				req: undefined,
				details: undefined,
			};

			const result = errorRow(errorData);
			expect(result).toContain('Test error');
			expect(result).toContain('-');
		});
	});
});
