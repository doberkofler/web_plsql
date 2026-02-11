import {StatsManager} from '../util/statsManager.ts';
import type {Pool} from '../util/db.ts';
import type {configType, argsType} from '../types.ts';
import type {Cache} from '../util/cache.ts';

export type AdminContextType = {
	startTime: Date;
	config: configType | null;
	pools: Pool[];
	caches: {poolName: string; procedureNameCache: Cache<string>; argumentCache: Cache<argsType>}[];
	paused: boolean;
	statsManager: StatsManager;
};

/**
 * Global Admin Context
 */
export const AdminContext: AdminContextType = {
	startTime: new Date(),
	config: null,
	pools: [],
	caches: [],
	paused: false,
	statsManager: new StatsManager(),
};
