import {describe, it, expect} from 'vitest';
import {renderConfigValue} from '../../src/admin/js/templates/config.js';
import {cacheCard} from '../../src/admin/js/templates/cacheCard.js';
import {poolCard} from '../../src/admin/js/templates/poolCard.js';
import {errorRow} from '../../src/admin/js/templates/errorRow.js';

describe('Admin Templates', () => {
	describe('renderConfigValue', () => {
		it('should render null and undefined as "-"', () => {
			expect(renderConfigValue(null)).toBe('-');
			expect(renderConfigValue(undefined)).toBe('-');
		});

		it('should render strings as-is', () => {
			expect(renderConfigValue('test')).toBe('test');
			expect(renderConfigValue('hello world')).toBe('hello world');
		});

		it('should throw on non-string primitives', () => {
			expect(() => renderConfigValue(123)).toThrow('Unexpected non-string value: number');
			expect(() => renderConfigValue(true)).toThrow('Unexpected non-string value: boolean');
		});

		it('should render arrays', () => {
			const result = renderConfigValue(['item1', 'item2']);
			expect(result).toContain('item1');
			expect(result).toContain('item2');
			expect(result).toContain('flex-col');
		});

		it('should render objects as tables', () => {
			const result = renderConfigValue({key1: 'value1', key2: 'value2'});
			expect(result).toContain('key1');
			expect(result).toContain('value1');
			expect(result).toContain('key2');
			expect(result).toContain('value2');
			expect(result).toContain('inner-config-table');
		});

		it('should handle masked values', () => {
			const result = renderConfigValue({password: '***hidden***'});
			expect(result).toContain('***hidden***');
			expect(result).not.toContain('JSON.stringify');
		});
	});

	describe('cacheCard', () => {
		it('should render cache card with stats', () => {
			const cacheData = {
				poolName: 'test-pool',
				procedureNameCache: {
					size: 10,
					stats: {hits: 100, misses: 20},
				},
				argumentCache: {
					size: 5,
					stats: {hits: 50, misses: 10},
				},
			};

			const result = cacheCard(cacheData);
			expect(result).toContain('test-pool');
			expect(result).toContain('10');
			expect(result).toContain('100');
			expect(result).toContain('20');
			expect(result).toContain('5');
			expect(result).toContain('50');
		});

		it('should calculate hit rates correctly', () => {
			const cacheData = {
				poolName: 'test-pool',
				procedureNameCache: {
					size: 10,
					stats: {hits: 80, misses: 20}, // 80% hit rate
				},
				argumentCache: {
					size: 5,
					stats: {hits: 90, misses: 10}, // 90% hit rate
				},
			};

			const result = cacheCard(cacheData);
			expect(result).toContain('80% Hit Rate');
			expect(result).toContain('90% Hit Rate');
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
