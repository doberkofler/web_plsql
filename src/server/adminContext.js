import {StatsManager} from '../util/statsManager.js';

/**
 * @typedef {import('oracledb').Pool} Pool
 * @typedef {import('../types.js').configType} configType
 * @typedef {import('../handler/plsql/procedureNamed.js').argsType} argsType
 * @typedef {import('../util/cache.js').Cache<unknown>} Cache
 */

/**
 * Global Admin Context
 */
export const AdminContext = {
	startTime: new Date(),
	/** @type {configType | null} */
	config: null,
	/** @type {Pool[]} */
	pools: [],
	/** @type {Array<{poolName: string, procedureNameCache: Cache, argumentCache: Cache}>} */
	caches: [],
	paused: false,
	statsManager: new StatsManager(),
};
