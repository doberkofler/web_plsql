/**
 * @typedef {object} StatsConfig
 * @property {number} intervalMs - Duration of each statistical bucket (default: 5000ms).
 * @property {number} maxHistoryPoints - Number of buckets to keep in the ring buffer (default: 200).
 * @property {boolean} sampleSystem - Whether to automatically sample CPU/Memory (default: true).
 * @property {boolean} samplePools - Whether to automatically sample Oracle pool utilization (default: true).
 * @property {number} percentilePrecision - Max number of samples per bucket for P95/P99 calculation (default: 1000).
 */
/**
 * @typedef {object} CacheStats
 * @property {number} size - Number of entries.
 * @property {number} hits - Number of hits.
 * @property {number} misses - Number of misses.
 */
/**
 * @typedef {object} PoolCacheSnapshot
 * @property {CacheStats} procedureName - Procedure name cache stats.
 * @property {CacheStats} argument - Argument cache stats.
 */
/**
 * @typedef {object} PoolSnapshot
 * @property {string} name - The pool name.
 * @property {number} connectionsInUse - Number of active connections.
 * @property {number} connectionsOpen - Number of open connections.
 * @property {PoolCacheSnapshot} [cache] - Cache statistics.
 */
/**
 * @typedef {object} Bucket
 * @property {number} timestamp - End time of the bucket.
 * @property {number} requests - Number of requests.
 * @property {number} errors - Number of errors.
 * @property {number} durationMin - Minimum duration.
 * @property {number} durationMax - Maximum duration.
 * @property {number} durationAvg - Average duration.
 * @property {number} durationP95 - 95th percentile duration.
 * @property {number} durationP99 - 99th percentile duration.
 * @property {object} system - System metrics.
 * @property {number} system.cpu - CPU usage percentage.
 * @property {number} system.heapUsed - Heap used in bytes.
 * @property {number} system.heapTotal - Heap total in bytes.
 * @property {number} system.rss - RSS in bytes.
 * @property {number} system.external - External memory in bytes.
 * @property {PoolSnapshot[]} pools - Pool utilization snapshots.
 */
/**
 * @typedef {object} CurrentBucket
 * @property {number} count - Number of requests.
 * @property {number} errors - Number of errors.
 * @property {number} durationSum - Sum of durations.
 * @property {number} durationMin - Minimum duration.
 * @property {number} durationMax - Maximum duration.
 * @property {number[]} durations - List of durations for percentile calculation.
 */
/**
 * @typedef {object} MemoryLifetime
 * @property {number} heapUsedMax - Max heap used.
 * @property {number} heapTotalMax - Max heap total.
 * @property {number} rssMax - Max RSS.
 * @property {number} externalMax - Max external.
 */
/**
 * @typedef {object} LifetimeStats
 * @property {number} totalRequests - Total requests.
 * @property {number} totalErrors - Total errors.
 * @property {number} minDuration - Min duration.
 * @property {number} maxDuration - Max duration.
 * @property {number} totalDuration - Total duration.
 * @property {number} maxRequestsPerSecond - Max requests per second.
 * @property {MemoryLifetime} memory - Memory extremes.
 * @property {object} cpu - CPU extremes.
 * @property {number} cpu.max - Max CPU.
 * @property {number} cpu.userMax - Max user CPU.
 * @property {number} cpu.systemMax - Max system CPU.
 */
/**
 * @typedef {object} StatsSummary
 * @property {Date} startTime - Server start time.
 * @property {number} totalRequests - Total requests handled.
 * @property {number} totalErrors - Total errors encountered.
 * @property {number} avgResponseTime - Lifetime average response time.
 * @property {number} minResponseTime - Lifetime minimum response time.
 * @property {number} maxResponseTime - Lifetime maximum response time.
 * @property {number} maxRequestsPerSecond - Lifetime maximum requests per second.
 * @property {MemoryLifetime} maxMemory - Lifetime memory extremes.
 * @property {object} cpu - CPU extremes.
 * @property {number} cpu.max - Max CPU usage percentage.
 * @property {number} cpu.userMax - Max user CPU usage in microseconds.
 * @property {number} cpu.systemMax - Max system CPU usage in microseconds.
 */
/**
 * Manager for statistical data collection and temporal bucketing.
 */
export class StatsManager {
    /**
     * @param {Partial<StatsConfig>} config - Configuration.
     */
    constructor(config?: Partial<StatsConfig>);
    /** @type {StatsConfig} */
    config: StatsConfig;
    startTime: Date;
    /** @type {Bucket[]} */
    history: Bucket[];
    /** @type {LifetimeStats} */
    lifetime: LifetimeStats;
    /** @type {CurrentBucket} */
    _currentBucket: CurrentBucket;
    _lastCpuUsage: NodeJS.CpuUsage;
    /** @type {[number, number]} */
    _lastCpuTimestamp: [number, number];
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    _timer: ReturnType<typeof setTimeout> | undefined;
    /**
     * Reset the current bucket accumulator.
     * @private
     */
    private _resetBucket;
    /**
     * Record a request event.
     * @param {number} duration - Duration in milliseconds.
     * @param {boolean} isError - Whether the request was an error.
     */
    recordRequest(duration: number, isError?: boolean): void;
    /**
     * Calculate CPU usage percentage since last call.
     * @private
     * @returns {number} CPU usage percentage (0-100).
     */
    private _calculateCpuUsage;
    /**
     * Rotate the current bucket into history and start a new one.
     * @param {PoolSnapshot[]} [poolSnapshots] - Optional pool snapshots to include.
     */
    rotateBucket(poolSnapshots?: PoolSnapshot[]): void;
    /**
     * Stop the background timer.
     */
    stop(): void;
    /**
     * Get lifetime summary.
     * @returns {StatsSummary} Summary.
     */
    getSummary(): StatsSummary;
    /**
     * Get history buffer.
     * @returns {Bucket[]} The history buffer.
     */
    getHistory(): Bucket[];
}
export type StatsConfig = {
    /**
     * - Duration of each statistical bucket (default: 5000ms).
     */
    intervalMs: number;
    /**
     * - Number of buckets to keep in the ring buffer (default: 200).
     */
    maxHistoryPoints: number;
    /**
     * - Whether to automatically sample CPU/Memory (default: true).
     */
    sampleSystem: boolean;
    /**
     * - Whether to automatically sample Oracle pool utilization (default: true).
     */
    samplePools: boolean;
    /**
     * - Max number of samples per bucket for P95/P99 calculation (default: 1000).
     */
    percentilePrecision: number;
};
export type CacheStats = {
    /**
     * - Number of entries.
     */
    size: number;
    /**
     * - Number of hits.
     */
    hits: number;
    /**
     * - Number of misses.
     */
    misses: number;
};
export type PoolCacheSnapshot = {
    /**
     * - Procedure name cache stats.
     */
    procedureName: CacheStats;
    /**
     * - Argument cache stats.
     */
    argument: CacheStats;
};
export type PoolSnapshot = {
    /**
     * - The pool name.
     */
    name: string;
    /**
     * - Number of active connections.
     */
    connectionsInUse: number;
    /**
     * - Number of open connections.
     */
    connectionsOpen: number;
    /**
     * - Cache statistics.
     */
    cache?: PoolCacheSnapshot;
};
export type Bucket = {
    /**
     * - End time of the bucket.
     */
    timestamp: number;
    /**
     * - Number of requests.
     */
    requests: number;
    /**
     * - Number of errors.
     */
    errors: number;
    /**
     * - Minimum duration.
     */
    durationMin: number;
    /**
     * - Maximum duration.
     */
    durationMax: number;
    /**
     * - Average duration.
     */
    durationAvg: number;
    /**
     * - 95th percentile duration.
     */
    durationP95: number;
    /**
     * - 99th percentile duration.
     */
    durationP99: number;
    /**
     * - System metrics.
     */
    system: {
        cpu: number;
        heapUsed: number;
        heapTotal: number;
        rss: number;
        external: number;
    };
    /**
     * - Pool utilization snapshots.
     */
    pools: PoolSnapshot[];
};
export type CurrentBucket = {
    /**
     * - Number of requests.
     */
    count: number;
    /**
     * - Number of errors.
     */
    errors: number;
    /**
     * - Sum of durations.
     */
    durationSum: number;
    /**
     * - Minimum duration.
     */
    durationMin: number;
    /**
     * - Maximum duration.
     */
    durationMax: number;
    /**
     * - List of durations for percentile calculation.
     */
    durations: number[];
};
export type MemoryLifetime = {
    /**
     * - Max heap used.
     */
    heapUsedMax: number;
    /**
     * - Max heap total.
     */
    heapTotalMax: number;
    /**
     * - Max RSS.
     */
    rssMax: number;
    /**
     * - Max external.
     */
    externalMax: number;
};
export type LifetimeStats = {
    /**
     * - Total requests.
     */
    totalRequests: number;
    /**
     * - Total errors.
     */
    totalErrors: number;
    /**
     * - Min duration.
     */
    minDuration: number;
    /**
     * - Max duration.
     */
    maxDuration: number;
    /**
     * - Total duration.
     */
    totalDuration: number;
    /**
     * - Max requests per second.
     */
    maxRequestsPerSecond: number;
    /**
     * - Memory extremes.
     */
    memory: MemoryLifetime;
    /**
     * - CPU extremes.
     */
    cpu: {
        max: number;
        userMax: number;
        systemMax: number;
    };
};
export type StatsSummary = {
    /**
     * - Server start time.
     */
    startTime: Date;
    /**
     * - Total requests handled.
     */
    totalRequests: number;
    /**
     * - Total errors encountered.
     */
    totalErrors: number;
    /**
     * - Lifetime average response time.
     */
    avgResponseTime: number;
    /**
     * - Lifetime minimum response time.
     */
    minResponseTime: number;
    /**
     * - Lifetime maximum response time.
     */
    maxResponseTime: number;
    /**
     * - Lifetime maximum requests per second.
     */
    maxRequestsPerSecond: number;
    /**
     * - Lifetime memory extremes.
     */
    maxMemory: MemoryLifetime;
    /**
     * - CPU extremes.
     */
    cpu: {
        max: number;
        userMax: number;
        systemMax: number;
    };
};
