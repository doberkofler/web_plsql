import {describe, it, expect} from 'vitest';
import {renderConfig} from './config.js';

describe('templates/config', () => {
	describe('renderConfig', () => {
		it('should render server section with port', () => {
			const result = renderConfig({port: 8080, adminRoute: '/admin'});
			expect(result).toContain('8080');
			expect(result).toContain('/admin');
		});

		it('should render upload size limit when number', () => {
			const result = renderConfig({uploadFileSizeLimit: 1024 * 1024});
			expect(result).toContain('1.00 MB');
			expect(result).toContain('1,048,576 bytes');
		});

		it('should render upload size limit with different value', () => {
			const result = renderConfig({uploadFileSizeLimit: 5 * 1024 * 1024});
			expect(result).toContain('5.00 MB');
		});

		it('should render default values for missing optional server config', () => {
			const result = renderConfig({});
			expect(result).toContain('(Not authenticated)');
			expect(result).toContain('(None)');
			expect(result).toContain('(Logging disabled)');
			expect(result).toContain('No limit');
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

		it('should render PL/SQL routes with empty exclusion list', () => {
			const result = renderConfig({
				routePlSql: [{route: '/plsql', exclusionList: []}],
			});
			expect(result).toContain('(None)');
		});

		it('should render PL/SQL routes with custom transaction mode (function)', () => {
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

		it('should render PL/SQL routes with string transaction mode', () => {
			const result = renderConfig({
				routePlSql: [{route: '/plsql', transactionMode: 'rollback'}],
			});
			expect(result).toContain('rollback');
		});

		it('should render PL/SQL routes with missing optional fields', () => {
			const result = renderConfig({
				routePlSql: [{route: '/plsql'}],
			});
			expect(result).toContain('(Not set)');
			expect(result).toContain('index');
			expect(result).toContain('table');
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

		it('should render multiple PL/SQL routes', () => {
			const result = renderConfig({
				routePlSql: [
					{route: '/plsql1', user: 'user1'},
					{route: '/plsql2', user: 'user2'},
				],
			});
			expect(result).toContain('/plsql1');
			expect(result).toContain('/plsql2');
			expect(result).toContain('PL/SQL Route #1');
			expect(result).toContain('PL/SQL Route #2');
		});

		it('should render multiple static routes', () => {
			const result = renderConfig({
				routeStatic: [{route: '/static1'}, {route: '/static2', directoryPath: '/path2'}],
			});
			expect(result).toContain('/static1');
			expect(result).toContain('/static2');
			expect(result).toContain('Static Route #1');
			expect(result).toContain('Static Route #2');
		});
	});
});
