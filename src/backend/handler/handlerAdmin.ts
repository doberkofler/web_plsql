import express, {type Request, type Response} from 'express';
import fs from 'node:fs';
import os from 'node:os';
import readline from 'node:readline';
import {AdminContext} from '../server/adminContext.ts';
import {traceManager} from '../util/traceManager.ts';
import {getVersion} from '../version.ts';
import {SHUTDOWN_GRACE_DELAY_MS} from '../../common/constants.ts';
import {forceShutdown} from '../util/shutdown.ts';
import {logEntrySchema, procedureTraceEntrySchema} from '../types.ts';
import {z} from 'zod';

const version = () => getVersion();

export const handlerAdmin = express.Router();

/**
 * Helper to read last N lines of a file
 * @param filePath - Path to file
 * @param n - Number of lines
 * @param filter - Optional filter string
 * @returns The lines
 */
const readLastLines = async (filePath: string, n = 100, filter = ''): Promise<string[]> => {
	if (!fs.existsSync(filePath)) {
		return [];
	}

	const fileStream = fs.createReadStream(filePath);
	const rl = readline.createInterface({
		input: fileStream,
		crlfDelay: Infinity,
	});

	const filterLower = filter.toLowerCase();

	const lines: string[] = [];
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
handlerAdmin.get('/api/status', (req: Request, res: Response) => {
	const uptime = (new Date().getTime() - AdminContext.startTime.getTime()) / 1000;
	const includeHistory = req.query.history === 'true';
	const includeConfig = req.query.config === 'true';

	const poolStats = AdminContext.pools.map((pool, index) => {
		const cache = AdminContext.caches[index];
		const name = cache?.poolName ?? `pool-${index}`;
		const p = pool as {getStatistics?: () => unknown};
		const stats = typeof p.getStatistics === 'function' ? p.getStatistics() : null;
		const procStats = cache?.procedureNameCache.getStats();
		const argStats = cache?.argumentCache.getStats();

		return {
			name,
			stats,
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
	const summary = AdminContext.statsManager.getSummary();

	const history = AdminContext.statsManager.getHistory();
	// If history is not requested, return only the last bucket for charts
	const historyData = includeHistory ? history : history.slice(-1);

	res.json({
		version: version(),
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
		history: historyData,
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
		config:
			includeConfig && AdminContext.config
				? {
						...AdminContext.config,
						adminPassword: AdminContext.config.adminPassword ? '********' : undefined,
						routePlSql: AdminContext.config.routePlSql.map((p) => ({
							...p,
							password: '********',
						})),
					}
				: undefined,
	});
});

// GET /api/stats/history
handlerAdmin.get('/api/stats/history', (req: Request, res: Response) => {
	const limitQuery = req.query.limit;
	let limit = 100;
	if (typeof limitQuery === 'string') {
		const parsed = Number(limitQuery);
		if (!isNaN(parsed)) {
			limit = parsed;
		}
	}

	const history = AdminContext.statsManager.getHistory();
	// Return the last 'limit' entries, reversed (newest first)
	// Create a copy to avoid mutating the original history array
	const slice = limit > 0 ? history.slice(-limit) : [...history];
	res.json(slice.reverse());
});

// GET /api/logs/error
handlerAdmin.get('/api/logs/error', async (req: Request, res: Response) => {
	try {
		const limit = Number(req.query.limit) || 100;
		const filter = typeof req.query.filter === 'string' ? req.query.filter : '';
		const logFile = 'error.json.log';
		const lines = await readLastLines(logFile, limit, filter);
		const parsedLines = lines
			.map((line) => {
				try {
					return JSON.parse(line) as unknown;
				} catch {
					return null;
				}
			})
			.filter((l): l is unknown => l !== null);
		const schema = z.array(logEntrySchema);
		const logs = schema.safeParse(parsedLines);
		if (!logs.success) {
			// FIXME: this must be standardized
			throw new Error(`Validation failed: ${logs.error.message}`);
		}

		return res.json(logs.data.reverse());
	} catch (err) {
		return res.status(500).json({error: String(err)});
	}
});

// GET /api/logs/access
handlerAdmin.get('/api/logs/access', async (req: Request, res: Response) => {
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
handlerAdmin.post('/api/cache/clear', (req: Request, res: Response) => {
	const body = req.body as {poolName?: unknown} | null | undefined;
	const poolName = typeof body?.poolName === 'string' ? body.poolName : undefined;

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
handlerAdmin.post('/api/server/:action', (req: Request, res: Response) => {
	const action = req.params.action;

	if (action === 'stop') {
		res.json({message: 'Server shutting down...'});
		setTimeout(() => {
			forceShutdown();
		}, SHUTDOWN_GRACE_DELAY_MS);
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
handlerAdmin.get('/api/trace/status', (_req: Request, res: Response) => {
	res.json({enabled: traceManager.isEnabled()});
});

// POST /api/trace/toggle
handlerAdmin.post('/api/trace/toggle', (req: Request, res: Response) => {
	const body = req.body as {enabled?: unknown} | null | undefined;
	const enabled = typeof body?.enabled === 'boolean' ? body.enabled : false;
	traceManager.setEnabled(enabled);
	res.json({enabled: traceManager.isEnabled()});
});

// GET /api/trace/logs
handlerAdmin.get('/api/trace/logs', async (req: Request, res: Response) => {
	try {
		const limit = Number(req.query.limit) || 100;
		const filter = typeof req.query.filter === 'string' ? req.query.filter : '';
		const logFile = traceManager.getFilePath();
		const lines = await readLastLines(logFile, limit, filter);
		const parsedLines = lines
			.map((line) => {
				try {
					return JSON.parse(line) as unknown;
				} catch {
					return null;
				}
			})
			.filter((l): l is unknown => l !== null);
		const schema = z.array(procedureTraceEntrySchema);
		const logs = schema.safeParse(parsedLines);
		if (!logs.success) {
			// FIXME: this must be standardized
			throw new Error(`Validation failed: ${logs.error.message}`);
		}

		return res.json(logs.data.reverse());
	} catch (err) {
		return res.status(500).json({error: String(err)});
	}
});

// POST /api/trace/clear
handlerAdmin.post('/api/trace/clear', (_req: Request, res: Response) => {
	traceManager.clear();
	res.json({message: 'Traces cleared'});
});
