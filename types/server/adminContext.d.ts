import { StatsManager } from '../util/statsManager.ts';
import type { Pool } from 'oracledb';
import type { configType, argsType } from '../types.ts';
import type { Cache } from '../util/cache.ts';
export type AdminContextType = {
    startTime: Date;
    config: configType | null;
    pools: Pool[];
    caches: {
        poolName: string;
        procedureNameCache: Cache<string>;
        argumentCache: Cache<argsType>;
    }[];
    paused: boolean;
    statsManager: StatsManager;
};
/**
 * Global Admin Context
 */
export declare const AdminContext: AdminContextType;
