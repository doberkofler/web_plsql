/**
 * Web PL/SQL Gateway - Application Constants
 *
 * This file centralizes all hardcoded numeric and string constants used throughout
 * the application. Constants are organized by functional category.
 */
/**
 * DEFAULT_CACHE_MAX_SIZE = 10000
 *
 * Purpose: Maximum number of entries in the generic LFU (Least Frequently Used) cache.
 *
 * Defined In: src/util/cache.js:14
 *   constructor(maxSize = 10000)
 *
 * Used By:
 *   - procedureNameCache: Caches resolved Oracle procedure names (e.g., "HR.EMPLOYEES")
 *   - argumentCache: Caches procedure argument introspection results from all_arguments view
 *
 * Related Values:
 *   - CACHE_PRUNE_PERCENT (0.1): When cache is full, removes 10% = 1000 entries
 *   - Cache instantiation in src/handler/plsql/handlerPlSql.js creates new Cache() without params
 *
 * Implications:
 *   - Memory footprint: ~1-2MB at max capacity (strings + hitCount metadata)
 *   - Pruning: Removes least-frequently-used entries when full
 *   - Higher values = better cache hit rates but more memory
 *
 * Duplicates: None - unique value with specific semantic meaning
 */
export const DEFAULT_CACHE_MAX_SIZE: 10000;
/**
 * CACHE_PRUNE_PERCENT = 0.1
 *
 * Purpose: Fraction of cache entries to remove during pruning (10%).
 *
 * Defined In: src/util/cache.js:87
 *   const removeCount = Math.floor(this.maxSize * 0.1);
 *
 * Used By: Cache.prune() method only
 *
 * Related Values:
 *   - DEFAULT_CACHE_MAX_SIZE (10000): Applied to this value to calculate removeCount = 1000
 *
 * Implications:
 *   - Balances between removing too few entries (frequent pruning) vs too many (evicting useful data)
 *   - 10% is a common pattern for cache eviction
 *
 * Duplicates: None
 */
export const CACHE_PRUNE_PERCENT: 0.1;
