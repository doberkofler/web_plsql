import {StatsManager} from '../util/statsManager.ts';
import type {Pool} from 'oracledb';
import type {configType, argsType} from '../types.ts';
import type {Cache} from '../util/cache.ts';

export type PoolCacheEntry = {
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

	constructor(config: configType, pools: Pool[], caches: PoolCacheEntry[]) {
		this.startTime = new Date();
		this.config = config;
		this.pools = pools;
		this.caches = caches;
		this.statsManager = new StatsManager();
		this._paused = false;
	}

	get paused(): boolean {
		return this._paused;
	}

	setPaused(value: boolean): void {
		this._paused = value;
	}
}
