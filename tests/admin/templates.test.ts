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

		it('should render PL/SQL routes', () => {
			const result = renderConfig({
				routePlSql: [{route: '/plsql', user: 'scott'}],
			});
			expect(result).toContain('/plsql');
			expect(result).toContain('scott');
		});

		it('should render static routes', () => {
			const result = renderConfig({
				routeStatic: [{route: '/static'}],
			});
			expect(result).toContain('/static');
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
