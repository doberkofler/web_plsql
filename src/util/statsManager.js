import debugModule from 'debug';

const debug = debugModule('webplsql:statsManager');

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
	constructor(config = {}) {
		/** @type {StatsConfig} */
		this.config = {
			intervalMs: 5000,
			maxHistoryPoints: 1000,
			sampleSystem: true,
			samplePools: true,
			percentilePrecision: 1000,
			...config,
		};

		this.startTime = new Date();

		/** @type {Bucket[]} */
		this.history = [];

		/** @type {LifetimeStats} */
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

		/** @type {CurrentBucket} */
		this._currentBucket = {
			count: 0,
			errors: 0,
			durations: [],
			durationSum: 0,
			durationMin: -1,
			durationMax: -1,
		};

		this._lastCpuUsage = process.cpuUsage();
		/** @type {[number, number]} */
		this._lastCpuTimestamp = process.hrtime();

		/** @type {ReturnType<typeof setTimeout> | undefined} */
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
	 * @private
	 */
	_resetBucket() {
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
	 * @param {number} duration - Duration in milliseconds.
	 * @param {boolean} isError - Whether the request was an error.
	 */
	recordRequest(duration, isError = false) {
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
	 * Calculate CPU usage percentage since last call.
	 * @private
	 * @returns {number} CPU usage percentage (0-100).
	 */
	_calculateCpuUsage() {
		const hrtime = process.hrtime(this._lastCpuTimestamp);
		const usage = process.cpuUsage(this._lastCpuUsage);

		this._lastCpuTimestamp = process.hrtime();
		this._lastCpuUsage = process.cpuUsage();

		const elapTime = hrtime[0] * 1_000_000 + hrtime[1] / 1000;
		const totalUsage = usage.user + usage.system;

		const percent = elapTime > 0 ? (totalUsage / elapTime) * 100 : 0;
		return Math.min(100, Math.max(0, percent));
	}

	/**
	 * Rotate the current bucket into history and start a new one.
	 * @param {PoolSnapshot[]} [poolSnapshots] - Optional pool snapshots to include.
	 */
	rotateBucket(poolSnapshots = []) {
		const b = this._currentBucket;
		const memUsage = process.memoryUsage();
		const cpuUsage = process.cpuUsage();
		const cpu = this._calculateCpuUsage();

		// Update lifetime extremes
		const reqPerSec = b.count / (this.config.intervalMs / 1000);
		this.lifetime.maxRequestsPerSecond = Math.max(this.lifetime.maxRequestsPerSecond, reqPerSec);
		this.lifetime.memory.heapUsedMax = Math.max(this.lifetime.memory.heapUsedMax, memUsage.heapUsed);
		this.lifetime.memory.heapTotalMax = Math.max(this.lifetime.memory.heapTotalMax, memUsage.heapTotal);
		this.lifetime.memory.rssMax = Math.max(this.lifetime.memory.rssMax, memUsage.rss);
		this.lifetime.memory.externalMax = Math.max(this.lifetime.memory.externalMax, memUsage.external);
		this.lifetime.cpu.max = Math.max(this.lifetime.cpu.max, cpu);
		this.lifetime.cpu.userMax = Math.max(this.lifetime.cpu.userMax, cpuUsage.user);
		this.lifetime.cpu.systemMax = Math.max(this.lifetime.cpu.systemMax, cpuUsage.system);

		let p95 = 0;
		let p99 = 0;
		if (b.durations.length > 0) {
			const sorted = [...b.durations].sort((x, y) => x - y);
			const p95Idx = Math.floor(sorted.length * 0.95);
			const p99Idx = Math.floor(sorted.length * 0.99);
			const lastIdx = sorted.length - 1;

			p95 = sorted[p95Idx] ?? sorted[lastIdx] ?? 0;
			p99 = sorted[p99Idx] ?? sorted[lastIdx] ?? 0;
		}

		/** @type {Bucket} */
		const bucket = {
			timestamp: Date.now(),
			requests: b.count,
			errors: b.errors,
			durationMin: b.durationMin < 0 ? 0 : b.durationMin,
			durationMax: b.durationMax < 0 ? 0 : b.durationMax,
			durationAvg: b.count > 0 ? b.durationSum / b.count : 0,
			durationP95: p95,
			durationP99: p99,
			system: {
				cpu,
				heapUsed: memUsage.heapUsed,
				heapTotal: memUsage.heapTotal,
				rss: memUsage.rss,
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
	stop() {
		if (this._timer) {
			clearInterval(this._timer);
			this._timer = undefined;
		}
	}

	/**
	 * Get lifetime summary.
	 * @returns {StatsSummary} Summary.
	 */
	getSummary() {
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
	 * @returns {Bucket[]} The history buffer.
	 */
	getHistory() {
		return this.history;
	}
}
