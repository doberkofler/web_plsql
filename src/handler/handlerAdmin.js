import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import readline from 'node:readline';
import {AdminContext} from '../server/adminContext.js';
import {traceManager} from '../util/traceManager.js';
import {getVersion} from '../version.js';

const version = getVersion();
import {forceShutdown} from '../util/shutdown.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 */

/**
 * @typedef {import('../util/statsManager.js').Bucket} Bucket
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
 * @property {object} maxMemory - Lifetime memory extremes.
 * @property {number} maxMemory.heapUsedMax - Maximum heap used.
 * @property {number} maxMemory.heapTotalMax - Maximum heap total.
 * @property {number} maxMemory.rssMax - Maximum RSS.
 * @property {number} maxMemory.externalMax - Maximum external memory.
 * @property {object} cpu - Lifetime CPU extremes.
 * @property {number} cpu.max - Max CPU.
 * @property {number} cpu.userMax - Max user CPU.
 * @property {number} cpu.systemMax - Max system CPU.
 */

export const handlerAdmin = express.Router();

/**
 * Helper to read last N lines of a file
 * @param {string} filePath - Path to file
 * @param {number} n - Number of lines
 * @param {string} [filter] - Optional filter string
 * @returns {Promise<string[]>} - The lines
 */
const readLastLines = async (filePath, n = 100, filter = '') => {
	if (!fs.existsSync(filePath)) {
		return [];
	}

	const fileStream = fs.createReadStream(filePath);
	const rl = readline.createInterface({
		input: fileStream,
		crlfDelay: Infinity,
	});

	const filterLower = filter.toLowerCase();

	/** @type {string[]} */
	const lines = [];
	for await (const line of rl) {
		if (!filter || line.toLowerCase().includes(filterLower)) {
			lines.push(line);
			if (lines.length > n) {
				lines.shift();
			}
		}
	}
	return lines;
};

// GET /api/status
handlerAdmin.get('/api/status', (_req, res) => {
	const uptime = (new Date().getTime() - AdminContext.startTime.getTime()) / 1000;

	const poolStats = AdminContext.pools.map((pool, index) => {
		const cache = AdminContext.caches[index];
		const name = cache?.poolName ?? `pool-${index}`;
		const p = /** @type {import('oracledb').Pool & {getStatistics?: () => Record<string, unknown>}} */ (pool);
		const procStats = cache?.procedureNameCache.getStats();
		const argStats = cache?.argumentCache.getStats();

		return {
			name,
			stats: typeof p.getStatistics === 'function' ? p.getStatistics() : null,
			connectionsOpen: pool.connectionsOpen,
			connectionsInUse: pool.connectionsInUse,
			cache: {
				procedureName: {
					size: cache?.procedureNameCache.keys().length ?? 0,
					hits: procStats?.hits ?? 0,
					misses: procStats?.misses ?? 0,
				},
				argument: {
					size: cache?.argumentCache.keys().length ?? 0,
					hits: argStats?.hits ?? 0,
					misses: argStats?.misses ?? 0,
				},
			},
		};
	});

	const memUsage = process.memoryUsage();
	const systemMemoryUsed = os.totalmem() - os.freemem();
	const cpuUsage = process.cpuUsage();
	const summary = /** @type {StatsSummary} */ (AdminContext.statsManager.getSummary());

	res.json({
		version,
		status: AdminContext.paused ? 'paused' : 'running',
		uptime,
		startTime: AdminContext.startTime,
		intervalMs: AdminContext.statsManager.config.intervalMs,
		metrics: {
			requestCount: summary.totalRequests,
			errorCount: summary.totalErrors,
			avgResponseTime: summary.avgResponseTime,
			minResponseTime: summary.minResponseTime,
			maxResponseTime: summary.maxResponseTime,
			maxRequestsPerSecond: summary.maxRequestsPerSecond,
		},
		history: AdminContext.statsManager.getHistory(),
		pools: poolStats,
		system: {
			nodeVersion: process.version,
			platform: process.platform,
			arch: process.arch,
			cpuCores: os.cpus().length,
			memory: {
				rss: systemMemoryUsed,
				heapTotal: memUsage.heapTotal,
				heapUsed: memUsage.heapUsed,
				external: memUsage.external,
				totalMemory: os.totalmem(),
				...summary.maxMemory,
			},
			cpu: {
				user: cpuUsage.user,
				system: cpuUsage.system,
				max: summary.cpu.max,
				userMax: summary.cpu.userMax,
				systemMax: summary.cpu.systemMax,
			},
		},
		config: AdminContext.config
			? {
					...AdminContext.config,
					adminPassword: AdminContext.config.adminPassword ? '********' : undefined,
					routePlSql: AdminContext.config.routePlSql.map((p) => ({
						...p,
						password: '********',
					})),
				}
			: null,
	});
});

// GET /api/logs/error
handlerAdmin.get('/api/logs/error', async (req, res) => {
	try {
		const limit = Number(req.query.limit) || 100;
		const filter = typeof req.query.filter === 'string' ? req.query.filter : '';
		const logFile = 'error.json.log';
		const lines = await readLastLines(logFile, limit, filter);

		/** @type {Record<string, unknown>[]} */
		const logs = [];
		for (const line of lines) {
			try {
				const parsed = /** @type {unknown} */ (JSON.parse(line));
				if (parsed && typeof parsed === 'object') {
					logs.push(/** @type {Record<string, unknown>} */ (parsed));
				}
			} catch (e) {
				// ignore
			}
		}

		res.json(logs.reverse());
	} catch (err) {
		res.status(500).json({error: String(err)});
	}
});

// GET /api/logs/access
handlerAdmin.get('/api/logs/access', async (req, res) => {
	try {
		const limit = Number(req.query.limit) || 100;
		const filter = typeof req.query.filter === 'string' ? req.query.filter : '';
		const logFile = AdminContext.config?.loggerFilename ?? 'access.log';

		if (!AdminContext.config?.loggerFilename) {
			res.json({message: 'Access logging not enabled'});
			return;
		}

		const lines = await readLastLines(logFile, limit, filter);
		res.json(lines.reverse());
	} catch (err) {
		res.status(500).json({error: String(err)});
	}
});

// GET /api/cache - REMOVED (Merged into /api/status)

// POST /api/cache/clear
handlerAdmin.post('/api/cache/clear', (req, res) => {
	const body = /** @type {unknown} */ (req.body);
	const poolName = body && typeof body === 'object' && 'poolName' in body && typeof body.poolName === 'string' ? body.poolName : undefined;

	let cleared = 0;
	AdminContext.caches.forEach((c) => {
		if (!poolName || c.poolName === poolName) {
			c.procedureNameCache.clear();
			cleared++;
			c.argumentCache.clear();
			cleared++;
		}
	});

	res.json({message: `Cleared ${cleared} caches`});
});

// POST /api/server/:action
handlerAdmin.post('/api/server/:action', (req, res) => {
	const action = req.params.action;

	if (action === 'stop') {
		res.json({message: 'Server shutting down...'});
		setTimeout(() => {
			forceShutdown();
		}, 100);
	} else if (action === 'pause') {
		AdminContext.paused = true;
		res.json({message: 'Server paused', status: 'paused'});
	} else if (action === 'resume') {
		AdminContext.paused = false;
		res.json({message: 'Server resumed', status: 'running'});
	} else {
		res.status(400).json({error: 'Invalid action'});
	}
});

// GET /api/trace/status
handlerAdmin.get('/api/trace/status', (_req, res) => {
	res.json({enabled: traceManager.isEnabled()});
});

// POST /api/trace/toggle
handlerAdmin.post('/api/trace/toggle', (req, res) => {
	const body = /** @type {unknown} */ (req.body);
	const enabled = body && typeof body === 'object' && 'enabled' in body && typeof body.enabled === 'boolean' ? body.enabled : false;
	traceManager.setEnabled(enabled);
	res.json({enabled: traceManager.isEnabled()});
});

// GET /api/trace/logs
handlerAdmin.get('/api/trace/logs', async (req, res) => {
	try {
		const limit = Number(req.query.limit) || 100;
		const filter = typeof req.query.filter === 'string' ? req.query.filter : '';
		const logFile = traceManager.getFilePath();
		const lines = await readLastLines(logFile, limit, filter);

		/** @type {Record<string, unknown>[]} */
		const logs = [];
		for (const line of lines) {
			try {
				const parsed = /** @type {unknown} */ (JSON.parse(line));
				if (parsed && typeof parsed === 'object') {
					logs.push(/** @type {Record<string, unknown>} */ (parsed));
				}
			} catch (e) {
				// ignore
			}
		}

		res.json(logs.reverse());
	} catch (err) {
		res.status(500).json({error: String(err)});
	}
});

// POST /api/trace/clear
handlerAdmin.post('/api/trace/clear', (_req, res) => {
	traceManager.clear();
	res.json({message: 'Traces cleared'});
});
