export namespace AdminContext {
    let startTime: Date;
    let config: configType | null;
    let pools: Pool[];
    let caches: Array<{
        poolName: string;
        procedureNameCache: Cache;
        argumentCache: Cache;
    }>;
    let paused: boolean;
    let statsManager: StatsManager;
}
export type Pool = import("oracledb").Pool;
export type configType = import("../types.js").configType;
export type argsType = import("../handler/plsql/procedureNamed.js").argsType;
export type Cache = import("../util/cache.js").Cache<unknown>;
import { StatsManager } from '../util/statsManager.js';
