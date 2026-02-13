import {StatsManager} from '../util/statsManager.ts';
import type {Pool} from 'oracledb';
import type {configType, argsType} from '../types.ts';
import type {Cache} from '../util/cache.ts';

type PoolCacheEntry = {
	poolName: string;
	procedureNameCache: Cache<string>;
	argumentCache: Cache<argsType>;
};

/**
 * Admin Context Class
 */
export class AdminContext {
	readonly startTime: Date;
	readonly config: configType;
	readonly pools: Pool[];
	readonly caches: PoolCacheEntry[];
	readonly statsManager: StatsManager;
	private _paused: boolean;

	constructor(config: configType) {
		this.startTime = new Date();
		this.config = config;
		this.pools = [];
		this.caches = [];
		this.statsManager = new StatsManager();
		this._paused = false;
	}

	/**
	 * Register a PL/SQL handler with the admin context.
	 * @param route - The route for the handler.
	 * @param pool - The connection pool.
	 * @param procedureNameCache - The procedure name cache.
	 * @param argumentCache - The argument cache.
	 */
	registerHandler(route: string, pool: Pool, procedureNameCache: Cache<string>, argumentCache: Cache<argsType>): void {
		this.pools.push(pool);
		this.caches.push({
			poolName: route,
			procedureNameCache,
			argumentCache,
		});
	}

	get paused(): boolean {
		return this._paused;
	}

	setPaused(value: boolean): void {
		this._paused = value;
	}
}
