export type StatsConfig = {
    intervalMs: number;
    maxHistoryPoints: number;
    sampleSystem: boolean;
    samplePools: boolean;
    percentilePrecision: number;
};
export type CacheStats = {
    size: number;
    hits: number;
    misses: number;
};
export type PoolCacheSnapshot = {
    procedureName: CacheStats;
    argument: CacheStats;
};
export type PoolSnapshot = {
    name: string;
    connectionsInUse: number;
    connectionsOpen: number;
    cache?: PoolCacheSnapshot;
};
export type Bucket = {
    timestamp: number;
    requests: number;
    errors: number;
    durationMin: number;
    durationMax: number;
    durationAvg: number;
    durationP95: number;
    durationP99: number;
    system: {
        cpu: number;
        heapUsed: number;
        heapTotal: number;
        rss: number;
        external: number;
    };
    pools: PoolSnapshot[];
};
export type CurrentBucket = {
    count: number;
    errors: number;
    durationSum: number;
    durationMin: number;
    durationMax: number;
    durations: number[];
};
export type MemoryLifetime = {
    heapUsedMax: number;
    heapTotalMax: number;
    rssMax: number;
    externalMax: number;
};
export type LifetimeStats = {
    totalRequests: number;
    totalErrors: number;
    minDuration: number;
    maxDuration: number;
    totalDuration: number;
    maxRequestsPerSecond: number;
    memory: MemoryLifetime;
    cpu: {
        max: number;
        userMax: number;
        systemMax: number;
    };
};
export type StatsSummary = {
    startTime: Date;
    totalRequests: number;
    totalErrors: number;
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    maxRequestsPerSecond: number;
    maxMemory: MemoryLifetime;
    cpu: {
        max: number;
        userMax: number;
        systemMax: number;
    };
};
/**
 * Manager for statistical data collection and temporal bucketing.
 */
export declare class StatsManager {
    config: StatsConfig;
    startTime: Date;
    history: Bucket[];
    lifetime: LifetimeStats;
    _currentBucket: CurrentBucket;
    _lastCpuTimes: {
        user: number;
        nice: number;
        sys: number;
        idle: number;
        irq: number;
        total: number;
    };
    _timer: NodeJS.Timeout | undefined;
    /**
     * @param config - Configuration.
     */
    constructor(config?: Partial<StatsConfig>);
    /**
     * Reset the current bucket accumulator.
     */
    private _resetBucket;
    /**
     * Record a request event.
     * @param duration - Duration in milliseconds.
     * @param isError - Whether the request was an error.
     */
    recordRequest(duration: number, isError?: boolean): void;
    /**
     * Get system CPU times.
     * @returns System CPU times.
     */
    private _getSystemCpuTimes;
    /**
     * Calculate CPU usage percentage since last call.
     * @returns CPU usage percentage (0-100).
     */
    private _calculateCpuUsage;
    /**
     * Rotate the current bucket into history and start a new one.
     * @param poolSnapshots - Optional pool snapshots to include.
     */
    rotateBucket(poolSnapshots?: PoolSnapshot[]): void;
    /**
     * Stop the background timer.
     */
    stop(): void;
    /**
     * Get lifetime summary.
     * @returns Summary.
     */
    getSummary(): StatsSummary;
    /**
     * Get history buffer.
     * @returns The history buffer.
     */
    getHistory(): Bucket[];
}
