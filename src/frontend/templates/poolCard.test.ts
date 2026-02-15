import {describe, it, expect} from 'vitest';
import {poolCard} from './poolCard.ts';

describe('templates/poolCard', () => {
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

	it('should calculate utilization correctly at 50%', () => {
		const poolData = {
			name: 'main-pool',
			connectionsOpen: 10,
			connectionsInUse: 5,
			stats: null,
		};

		const result = poolCard(poolData);
		expect(result).toContain('50%');
		expect(result).toContain('var(--success)');
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

	it('should use danger color when utilization > 90%', () => {
		const poolData = {
			name: 'critical-pool',
			connectionsOpen: 100,
			connectionsInUse: 95,
			stats: null,
		};

		const result = poolCard(poolData);
		expect(result).toContain('95%');
		expect(result).toContain('var(--danger)');
	});

	it('should use warning color when utilization > 70%', () => {
		const poolData = {
			name: 'warning-pool',
			connectionsOpen: 100,
			connectionsInUse: 75,
			stats: null,
		};

		expect(poolCard(poolData)).toContain('75%');
		expect(poolCard(poolData)).toContain('var(--warning)');
	});

	it('should use success color when utilization <= 70%', () => {
		const poolData = {
			name: 'healthy-pool',
			connectionsOpen: 100,
			connectionsInUse: 50,
			stats: null,
		};

		const result = poolCard(poolData);
		expect(result).toContain('50%');
		expect(result).toContain('var(--success)');
	});

	it('should handle zero open connections', () => {
		const poolData = {
			name: 'empty-pool',
			connectionsOpen: 0,
			connectionsInUse: 0,
			stats: null,
		};

		const result = poolCard(poolData);
		expect(result).toContain('0%');
		expect(result).toContain('0 / 0');
	});

	it('should show timeout in danger color when timeouts exist', () => {
		const poolData = {
			name: 'timeout-pool',
			connectionsOpen: 10,
			connectionsInUse: 3,
			stats: {
				totalRequests: 1000,
				totalTimeouts: 1,
			},
		};

		const result = poolCard(poolData);
		expect(result).toContain('text-danger');
		expect(result).toContain('1');
	});

	it('should show timeout in accent color when no timeouts', () => {
		const poolData = {
			name: 'no-timeout-pool',
			connectionsOpen: 10,
			connectionsInUse: 3,
			stats: {
				totalRequests: 1000,
				totalTimeouts: 0,
			},
		};

		const result = poolCard(poolData);
		expect(result).toContain('text-accent');
	});

	it('should handle large numbers with locale formatting', () => {
		const poolData = {
			name: 'large-pool',
			connectionsOpen: 100,
			connectionsInUse: 50,
			stats: {
				totalRequests: 1_000_000,
				totalTimeouts: 100,
			},
		};

		const result = poolCard(poolData);
		expect(result).toContain('1,000,000');
		expect(result).toContain('100');
	});

	it('should handle single digit utilization', () => {
		const poolData = {
			name: 'low-pool',
			connectionsOpen: 100,
			connectionsInUse: 5,
			stats: null,
		};

		const result = poolCard(poolData);
		expect(result).toContain('5%');
	});
});
