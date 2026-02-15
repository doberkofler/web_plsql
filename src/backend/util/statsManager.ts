import debugModule from 'debug';
import os from 'node:os';
import {STATS_INTERVAL_MS, MAX_HISTORY_BUCKETS, MAX_PERCENTILE_SAMPLES} from '../../common/constants.ts';

const debug = debugModule('webplsql:statsManager');

type StatsConfig = {
	intervalMs: number;
	maxHistoryPoints: number;
	sampleSystem: boolean;
	samplePools: boolean;
	percentilePrecision: number;
};

type CacheStats = {
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

type Bucket = {
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

type CurrentBucket = {
	count: number;
	errors: number;
	durationSum: number;
	durationMin: number;
	durationMax: number;
	durations: number[];
};

type MemoryLifetime = {
	heapUsedMax: number;
	heapTotalMax: number;
	rssMax: number;
	externalMax: number;
};

type LifetimeStats = {
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

type StatsSummary = {
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
export class StatsManager {
	config: StatsConfig;
	startTime: Date;
	history: Bucket[];
	lifetime: LifetimeStats;
	_currentBucket: CurrentBucket;
	_lastCpuTimes: {user: number; nice: number; sys: number; idle: number; irq: number; total: number};
	_timer: NodeJS.Timeout | undefined;

	/**
	 * @param config - Configuration.
	 */
	constructor(config: Partial<StatsConfig> = {}) {
		this.config = {
			intervalMs: STATS_INTERVAL_MS,
			maxHistoryPoints: MAX_HISTORY_BUCKETS,
			sampleSystem: true,
			samplePools: true,
			percentilePrecision: MAX_PERCENTILE_SAMPLES,
			...config,
		};

		this.startTime = new Date();
		this.history = [];

		this.lifetime = {
			totalRequests: 0,
			totalErrors: 0,
			minDuration: -1,
			maxDuration: -1,
			totalDuration: 0,
			maxRequestsPerSecond: 0,
			memory: {
				heapUsedMax: 0,
				heapTotalMax: 0,
				rssMax: 0,
				externalMax: 0,
			},
			cpu: {
				max: 0,
				userMax: 0,
				systemMax: 0,
			},
		};

		this._currentBucket = {
			count: 0,
			errors: 0,
			durations: [],
			durationSum: 0,
			durationMin: -1,
			durationMax: -1,
		};

		this._lastCpuTimes = this._getSystemCpuTimes();

		this._timer = undefined;
		if (this.config.sampleSystem) {
			this._timer = setInterval(() => {
				this.rotateBucket();
			}, this.config.intervalMs);
			if (this._timer && typeof this._timer.unref === 'function') {
				this._timer.unref();
			}
		}
	}

	/**
	 * Reset the current bucket accumulator.
	 */
	private _resetBucket(): void {
		this._currentBucket = {
			count: 0,
			errors: 0,
			durations: [],
			durationSum: 0,
			durationMin: -1,
			durationMax: -1,
		};
	}

	/**
	 * Record a request event.
	 * @param duration - Duration in milliseconds.
	 * @param isError - Whether the request was an error.
	 */
	recordRequest(duration: number, isError = false): void {
		this.lifetime.totalRequests++;
		if (isError) {
			this.lifetime.totalErrors++;
		}

		this.lifetime.totalDuration += duration;
		if (this.lifetime.minDuration < 0 || duration < this.lifetime.minDuration) {
			this.lifetime.minDuration = duration;
		}
		if (this.lifetime.maxDuration < 0 || duration > this.lifetime.maxDuration) {
			this.lifetime.maxDuration = duration;
		}

		const b = this._currentBucket;
		b.count++;
		if (isError) {
			b.errors++;
		}

		b.durationSum += duration;
		if (b.durationMin < 0 || duration < b.durationMin) {
			b.durationMin = duration;
		}
		if (b.durationMax < 0 || duration > b.durationMax) {
			b.durationMax = duration;
		}

		if (b.durations.length < this.config.percentilePrecision) {
			b.durations.push(duration);
		}
	}

	/**
	 * Get system CPU times.
	 * @returns System CPU times.
	 */
	private _getSystemCpuTimes(): {user: number; nice: number; sys: number; idle: number; irq: number; total: number} {
		const cpus = os.cpus();
		let user = 0;
		let nice = 0;
		let sys = 0;
		let idle = 0;
		let irq = 0;

		for (const cpu of cpus) {
			user += cpu.times.user;
			nice += cpu.times.nice;
			sys += cpu.times.sys;
			idle += cpu.times.idle;
			irq += cpu.times.irq;
		}

		const total = user + nice + sys + idle + irq;
		return {user, nice, sys, idle, irq, total};
	}

	/**
	 * Calculate CPU usage percentage since last call.
	 * @returns CPU usage percentage (0-100).
	 */
	private _calculateCpuUsage(): number {
		const current = this._getSystemCpuTimes();
		const last = this._lastCpuTimes || {user: 0, nice: 0, sys: 0, idle: 0, irq: 0, total: 0};

		const deltaTotal = current.total - last.total;
		const deltaIdle = current.idle - last.idle;

		this._lastCpuTimes = current;

		if (deltaTotal <= 0) return 0;

		const percent = ((deltaTotal - deltaIdle) / deltaTotal) * 100;
		return Math.min(100, Math.max(0, percent));
	}

	/**
	 * Rotate the current bucket into history and start a new one.
	 * @param poolSnapshots - Optional pool snapshots to include.
	 */
	rotateBucket(poolSnapshots: PoolSnapshot[] = []): void {
		const b = this._currentBucket;
		const memUsage = process.memoryUsage();
		const systemMemoryUsed = os.totalmem() - os.freemem();
		const cpuUsage = process.cpuUsage();
		const cpu = this._calculateCpuUsage();

		// Update lifetime extremes
		const reqPerSec = b.count / (this.config.intervalMs / 1000);
		this.lifetime.maxRequestsPerSecond = Math.max(this.lifetime.maxRequestsPerSecond, reqPerSec);
		this.lifetime.memory.heapUsedMax = Math.max(this.lifetime.memory.heapUsedMax, memUsage.heapUsed);
		this.lifetime.memory.heapTotalMax = Math.max(this.lifetime.memory.heapTotalMax, memUsage.heapTotal);
		this.lifetime.memory.rssMax = Math.max(this.lifetime.memory.rssMax, systemMemoryUsed);
		this.lifetime.memory.externalMax = Math.max(this.lifetime.memory.externalMax, memUsage.external);
		this.lifetime.cpu.max = Math.max(this.lifetime.cpu.max, cpu);
		this.lifetime.cpu.userMax = Math.max(this.lifetime.cpu.userMax, cpuUsage.user);
		this.lifetime.cpu.systemMax = Math.max(this.lifetime.cpu.systemMax, cpuUsage.system);

		let p95 = 0;
		let p99 = 0;
		if (b.durations.length > 0) {
			const sorted = b.durations.toSorted((x, y) => x - y);
			const p95Idx = Math.floor(sorted.length * 0.95);
			const p99Idx = Math.floor(sorted.length * 0.99);
			const lastIdx = sorted.length - 1;

			p95 = sorted[p95Idx] ?? sorted[lastIdx] ?? 0;
			p99 = sorted[p99Idx] ?? sorted[lastIdx] ?? 0;
		}

		const bucket: Bucket = {
			timestamp: Date.now(),
			requests: b.count,
			errors: b.errors,
			durationMin: Math.max(b.durationMin, 0),
			durationMax: Math.max(b.durationMax, 0),
			durationAvg: b.count > 0 ? b.durationSum / b.count : 0,
			durationP95: p95,
			durationP99: p99,
			system: {
				cpu,
				heapUsed: memUsage.heapUsed,
				heapTotal: memUsage.heapTotal,
				rss: systemMemoryUsed,
				external: memUsage.external,
			},
			pools: poolSnapshots,
		};

		this.history.push(bucket);
		if (this.history.length > this.config.maxHistoryPoints) {
			this.history.shift();
		}

		this._resetBucket();
		debug('Bucket rotated: %j', bucket);
	}

	/**
	 * Stop the background timer.
	 */
	stop(): void {
		if (this._timer) {
			clearInterval(this._timer);
			this._timer = undefined;
		}
	}

	/**
	 * Get lifetime summary.
	 * @returns Summary.
	 */
	getSummary(): StatsSummary {
		return {
			startTime: this.startTime,
			totalRequests: this.lifetime.totalRequests,
			totalErrors: this.lifetime.totalErrors,
			avgResponseTime: this.lifetime.totalRequests > 0 ? this.lifetime.totalDuration / this.lifetime.totalRequests : 0,
			minResponseTime: this.lifetime.minDuration,
			maxResponseTime: this.lifetime.maxDuration,
			maxRequestsPerSecond: this.lifetime.maxRequestsPerSecond,
			maxMemory: this.lifetime.memory,
			cpu: this.lifetime.cpu,
		};
	}

	/**
	 * Get history buffer.
	 * @returns The history buffer.
	 */
	getHistory(): Bucket[] {
		return this.history;
	}
}
