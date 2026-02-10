/**
 * Web PL/SQL Gateway - Application Constants
 *
 * This file centralizes all hardcoded numeric and string constants used throughout
 * the application. Constants are organized by functional category.
 */

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

/**
 * DEFAULT_CACHE_MAX_SIZE = 10000
 *
 * Purpose: Maximum number of entries in the generic LFU (Least Frequently Used) cache.
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
 */
export const DEFAULT_CACHE_MAX_SIZE = 10000;

/**
 * CACHE_PRUNE_PERCENT = 0.1
 *
 * Purpose: Fraction of cache entries to remove during pruning (10%).
 *
 * Used By: Cache.prune() method only
 *
 * Related Values:
 *   - DEFAULT_CACHE_MAX_SIZE (10000): Applied to this value to calculate removeCount = 1000
 *
 * Implications:
 *   - Balances between removing too few entries (frequent pruning) vs too many (evicting useful data)
 *   - 10% is a common pattern for cache eviction
 */
export const CACHE_PRUNE_PERCENT = 0.1;

// =============================================================================
// ORACLE LIMITS
// =============================================================================

/**
 * MAX_PROCEDURE_PARAMETERS = 1000
 *
 * Purpose: Maximum number of procedure arguments that can be introspected from Oracle's
 *          all_arguments view using BULK COLLECT with dbms_utility.name_resolve.
 *
 * Used By:
 *   - src/handler/plsql/procedureNamed.js
 *     bind.names = {maxArraySize: MAX_PARAMETER_NUMBER}
 *     bind.types = {maxArraySize: MAX_PARAMETER_NUMBER}
 *
 * Related Values:
 *   - Procedure introspection SQL: SQL_GET_ARGUMENT block at procedureNamed.js:27-43
 *   - oracledb.BIND_OUT direction for array fetches
 *
 * Implications:
 *   - This is an Oracle driver limitation for array binding, not an arbitrary choice
 *   - Procedures with >1000 arguments will have introspection truncated
 *   - No error handling exists for this edge case
 *   - Practical limit: most procedures have <50 arguments
 */
export const MAX_PROCEDURE_PARAMETERS = 1000;

/**
 * OWA_STREAM_CHUNK_SIZE = 1000
 *
 * Purpose: Number of lines fetched per Oracle OWA call when streaming page content.
 *
 * Used By:
 *   - owaPageStream.js: maxArraySize for :lines bind variable
 *   - owaPageStream.js: :irows INOUT parameter value
 *   - owaPageStream.js: Determines when streaming is complete (lines.length < chunkSize)
 *
 * Related Values:
 *   - OWA_GET_PAGE_SQL: 'BEGIN owa.get_page(thepage=>:lines, irows=>:irows); END;'
 *   - OWAPageStream class constructor at line 20
 *
 * Implications:
 *   - Controls round-trip frequency to Oracle database
 *   - Higher = fewer round-trips but larger memory buffers per fetch
 *   - Lower = more responsive streaming but more database calls
 *   - Each line is a PL/SQL varchar2; total data per chunk depends on htp.htbuf_len (63 chars)
 *   - Estimated max data per chunk: 1000 lines × 63 chars = 63KB
 */
export const OWA_STREAM_CHUNK_SIZE = 1000;

// =============================================================================
// STREAMING
// =============================================================================

/**
 * OWA_STREAM_BUFFER_SIZE = 16384
 *
 * Purpose: Node.js Readable stream highWaterMark in bytes (16KB).
 *
 * Defined In: src/handler/plsql/owaPageStream.js:20
 *   super({highWaterMark: 16384}); // 16KB buffer
 *
 * Used By: OWAPageStream class extends Readable stream
 *
 * Related Values:
 *   - OWA_STREAM_CHUNK_SIZE (1000): Lines per fetch
 *   - Default Node.js highWaterMark is 64KB (Readable stream default)
 *   - OWAPageStream.push() converts lines to string buffer
 *
 * Implications:
 *   - Smaller than default (64KB) = more frequent _read() callbacks
 *   - Reduces memory footprint for large responses
 *   - Improves backpressure handling responsiveness
 *   - Trade-off: More CPU for _read() calls vs memory efficiency
 *
 * Duplicates: None
 */
export const OWA_STREAM_BUFFER_SIZE = 16384;

/**
 * OWA_RESOLVED_NAME_MAX_LEN = 400
 *
 * Purpose: Maximum string length for resolved Oracle procedure canonical names.
 *          Canonical format: SCHEMA.PACKAGE.PROCEDURE or SCHEMA.PROCEDURE.
 *
 * Used By:
 *   - resolveProcedureName() function for dbms_utility.name_resolve output
 *   - Procedure name resolution SQL at procedureSanitize.js:46-76
 *
 * Related Values:
 *   - dbms_utility.name_resolve context = 1 (procedure/function resolution)
 *   - Oracle identifier limits: Schema (128) + Package (128) + Procedure (128) + 2 dots = ~386
 *   - 400 provides comfortable headroom
 *
 * Implications:
 *   - Oracle object names: 30 bytes for most, extended to 128 in some contexts
 *   - Canonical name: schema.package.procedure (max ~128+1+128+1+128 = 386)
 *   - 400 is safe upper bound with margin
 */
export const OWA_RESOLVED_NAME_MAX_LEN = 400;

// =============================================================================
// STATS COLLECTION
// =============================================================================

/**
 * STATS_INTERVAL_MS = 5000
 *
 * Purpose: Duration of each statistical bucket in milliseconds.
 *
 * Defined In: src/util/statsManager.js:114
 *   intervalMs: 5000,
 *
 * Used By:
 *   - src/util/statsManager.js:165: setInterval(this.rotateBucket, this.config.intervalMs)
 *   - src/handler/handlerAdmin.js:123: Exposed as intervalMs in /api/status response
 *   - src/admin/js/app.ts:191: Fallback: newStatus.intervalMs ?? 5000
 *   - src/admin/client/charts.ts:386: Fallback: state.status.intervalMs ?? 5000
 *
 * Related Values:
 *   - MAX_HISTORY_BUCKETS (1000): At 5s per bucket = ~83 minutes of history
 *   - MAX_PERCENTILE_SAMPLES (1000): Samples per bucket for P95/P99
 *
 * Implications:
 *   - Bucket aggregation: request counts, durations, errors, system metrics
 *   - Affects granularity of performance monitoring
 *   - Lower values = more granular but more history entries
 *   - Higher values = smoother averages but less detail
 */
export const STATS_INTERVAL_MS = 5000;
