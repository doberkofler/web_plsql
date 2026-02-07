import express from 'express';
import fs from 'node:fs';
import readline from 'node:readline';
import {AdminContext} from '../server/server.js';
import {getVersion} from '../version.js';

const version = getVersion();
import {forceShutdown} from '../util/shutdown.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 */

export const handlerAdmin = express.Router();

/**
 * Helper to read last N lines of a file
 * @param {string} filePath - Path to file
 * @param {number} n - Number of lines
 * @returns {Promise<string[]>} - The lines
 */
const readLastLines = async (filePath, n = 100) => {
	if (!fs.existsSync(filePath)) {
		return [];
	}

	const fileStream = fs.createReadStream(filePath);
	const rl = readline.createInterface({
		input: fileStream,
		crlfDelay: Infinity,
	});

	/** @type {string[]} */
	const lines = [];
	for await (const line of rl) {
		lines.push(line);
		if (lines.length > n) {
			lines.shift();
		}
	}
	return lines;
};

// GET /api/status
handlerAdmin.get('/api/status', (_req, res) => {
	const uptime = (new Date().getTime() - AdminContext.startTime.getTime()) / 1000;

	const poolStats = AdminContext.pools.map((pool, index) => {
		const name = AdminContext.caches[index]?.poolName ?? `pool-${index}`;
		const p = /** @type {import('oracledb').Pool & {getStatistics?: () => Record<string, unknown>}} */ (pool);
		return {
			name,
			stats: typeof p.getStatistics === 'function' ? p.getStatistics() : null,
			connectionsOpen: pool.connectionsOpen,
			connectionsInUse: pool.connectionsInUse,
		};
	});

	const memUsage = process.memoryUsage();
	const cpuUsage = process.cpuUsage();

	res.json({
		version,
		status: AdminContext.paused ? 'paused' : 'running',
		uptime,
		startTime: AdminContext.startTime,
		metrics: {
			...AdminContext.metrics,
			avgResponseTime: AdminContext.metrics.requestCount > 0 ? AdminContext.metrics.totalDuration / AdminContext.metrics.requestCount : 0,
		},
		pools: poolStats,
		system: {
			nodeVersion: process.version,
			platform: process.platform,
			arch: process.arch,
			memory: {
				rss: memUsage.rss,
				heapTotal: memUsage.heapTotal,
				heapUsed: memUsage.heapUsed,
				external: memUsage.external,
			},
			cpu: {
				user: cpuUsage.user,
				system: cpuUsage.system,
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
		const logFile = 'error.json.log';
		const lines = await readLastLines(logFile, limit);

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
		const logFile = AdminContext.config?.loggerFilename ?? 'access.log';

		if (!AdminContext.config?.loggerFilename) {
			res.json({message: 'Access logging not enabled'});
			return;
		}

		const lines = await readLastLines(logFile, limit);
		res.json(lines.reverse());
	} catch (err) {
		res.status(500).json({error: String(err)});
	}
});

// GET /api/cache
handlerAdmin.get('/api/cache', (_req, res) => {
	const caches = AdminContext.caches.map((c) => ({
		poolName: c.poolName,
		procedureNameCache: {
			size: c.procedureNameCache.keys().length,
			stats: c.procedureNameCache.getStats(),
		},
		argumentCache: {
			size: c.argumentCache.keys().length,
			stats: c.argumentCache.getStats(),
		},
	}));
	res.json(caches);
});

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
