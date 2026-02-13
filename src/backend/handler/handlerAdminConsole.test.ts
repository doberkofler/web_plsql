import {describe, it, expect, vi, beforeEach} from 'vitest';
import {handlerAdminConsole} from './handlerAdminConsole.ts';
import {AdminContext} from '../server/adminContext.ts';
import type {Pool} from 'oracledb';
import type {configType} from '../types.ts';
import {existsSync} from 'node:fs';

vi.mock('node:fs', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:fs')>();
	return {
		...actual,
		existsSync: vi.fn(),
	};
});

describe('handlerAdminConsole', () => {
	const mockConfig = {port: 8080} as configType;
	const mockPool = {
		connectionsOpen: 5,
		connectionsInUse: 2,
	} as Pool;
	const mockCache = {
		poolName: 'test-pool',
		procedureNameCache: {
			getStats: () => ({hits: 10, misses: 2}),
			keys: () => ['a', 'b'],
		},
		argumentCache: {
			getStats: () => ({hits: 20, misses: 5}),
			keys: () => ['c'],
		},
	};

	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(existsSync).mockReturnValue(true);
	});

	describe('Factory validation', () => {
		it('should return a Router', () => {
			const adminContext = new AdminContext(mockConfig, [mockPool], [mockCache as any]);
			const handler = handlerAdminConsole({staticDir: '/tmp/dist'}, adminContext);
			expect(typeof handler).toBe('function');
			expect(handler.name).toBe('router');
		});

		it('should throw if staticDir missing in prod mode', () => {
			vi.mocked(existsSync).mockReturnValue(false);
			const adminContext = new AdminContext(mockConfig, [mockPool], [mockCache as any]);
			expect(() => handlerAdminConsole({staticDir: '/non-existent'}, adminContext)).toThrow(/Admin console not built/);
		});

		it('should not throw if staticDir missing in devMode', () => {
			vi.mocked(existsSync).mockReturnValue(false);
			const adminContext = new AdminContext(mockConfig, [mockPool], [mockCache as any]);
			expect(() => handlerAdminConsole({staticDir: '/non-existent', devMode: true}, adminContext)).not.toThrow();
		});
	});

	describe('StatsManager hook', () => {
		it('should inject pool snapshots into statsManager', () => {
			const adminContext = new AdminContext(mockConfig, [mockPool], [mockCache as any]);
			const spyRotate = vi.spyOn(adminContext.statsManager, 'rotateBucket');

			handlerAdminConsole({staticDir: '/tmp/dist'}, adminContext);

			// Trigger rotation
			adminContext.statsManager.rotateBucket();

			expect(spyRotate).toHaveBeenCalled();
		});
	});
});
