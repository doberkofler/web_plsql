import {z} from 'zod';

/**
 * Cache statistics schema.
 */
export const cacheStatsSchema = z.object({
	size: z.number(),
	hits: z.number(),
	misses: z.number(),
});

/**
 * Pool cache snapshot schema.
 */
export const poolCacheSnapshotSchema = z.object({
	procedureName: cacheStatsSchema,
	argument: cacheStatsSchema,
});

/**
 * Pool statistics schema.
 */
export const poolStatsSchema = z.object({
	totalRequests: z.number(),
	totalTimeouts: z.number(),
	totalRequestsEnqueued: z.number().optional(),
	totalRequestsDequeued: z.number().optional(),
	totalRequestsFailed: z.number().optional(),
});

/**
 * Pool information schema.
 */
export const poolInfoSchema = z.object({
	name: z.string(),
	connectionsInUse: z.number(),
	connectionsOpen: z.number(),
	stats: poolStatsSchema.nullable(),
	cache: poolCacheSnapshotSchema.optional(),
});

/**
 * Server metrics schema.
 */
export const metricsSchema = z.object({
	requestCount: z.number(),
	errorCount: z.number(),
	avgResponseTime: z.number(),
	minResponseTime: z.number(),
	maxResponseTime: z.number(),
	maxRequestsPerSecond: z.number(),
});

/**
 * Historical bucket schema.
 */
export const bucketSchema = z.object({
	timestamp: z.number(),
	requests: z.number(),
	errors: z.number(),
	durationMin: z.number(),
	durationMax: z.number(),
	durationAvg: z.number(),
	durationP95: z.number(),
	durationP99: z.number(),
	system: z.object({
		cpu: z.number(),
		heapUsed: z.number(),
		heapTotal: z.number(),
		rss: z.number(),
		external: z.number(),
	}),
	pools: z.array(
		z.object({
			name: z.string(),
			connectionsInUse: z.number(),
			connectionsOpen: z.number(),
			cache: poolCacheSnapshotSchema.optional(),
		}),
	),
});

/**
 * Route configuration schema.
 */
export const routeConfigSchema = z.object({
	route: z.string(),
	// PL/SQL specific
	user: z.string().optional(),
	password: z.string().optional(),
	connectString: z.string().optional(),
	defaultPage: z.string().optional(),
	pathAlias: z.string().optional(),
	pathAliasProcedure: z.string().optional(),
	documentTable: z.string().optional(),
	exclusionList: z.array(z.string()).optional(),
	requestValidationFunction: z.string().optional(),
	transactionMode: z.unknown().optional(),
	errorStyle: z.string().optional(),
	// Static specific
	directoryPath: z.string().optional(),
});

/**
 * Server configuration schema.
 */
export const serverConfigSchema = z.object({
	port: z.number(),
	adminRoute: z.string().optional(),
	adminUser: z.string().optional(),
	adminPassword: z.string().optional(),
	loggerFilename: z.string(),
	uploadFileSizeLimit: z.number().optional(),
	routePlSql: z.array(routeConfigSchema),
	routeStatic: z.array(routeConfigSchema),
});

/**
 * System information schema.
 */
export const systemInfoSchema = z.object({
	nodeVersion: z.string(),
	platform: z.string(),
	arch: z.string(),
	cpuCores: z.number().optional(),
	memory: z.object({
		rss: z.number(),
		heapTotal: z.number(),
		heapUsed: z.number(),
		external: z.number(),
		totalMemory: z.number().optional(),
		rssMax: z.number().optional(),
		heapTotalMax: z.number().optional(),
		heapUsedMax: z.number().optional(),
		externalMax: z.number().optional(),
	}),
	cpu: z.object({
		user: z.number(),
		system: z.number(),
		max: z.number().optional(),
		userMax: z.number().optional(),
		systemMax: z.number().optional(),
	}),
});

/**
 * Server status response schema.
 */
export const statusSchema = z.object({
	version: z.string(),
	status: z.enum(['running', 'paused', 'stopped']),
	uptime: z.number(),
	startTime: z.string(),
	intervalMs: z.number().optional(),
	metrics: metricsSchema,
	history: z.array(bucketSchema).optional(),
	pools: z.array(poolInfoSchema),
	system: systemInfoSchema,
	config: serverConfigSchema.partial(),
});

/**
 * Error log entry schema.
 */
export const errorLogSchema = z.object({
	timestamp: z.string(),
	req: z
		.object({
			method: z.string().optional(),
			url: z.string().optional(),
		})
		.optional(),
	message: z.string(),
	details: z
		.object({
			fullMessage: z.string().optional(),
		})
		.optional(),
});

export const accessLogResponseSchema = z.union([z.array(z.string()), z.object({message: z.string()})]);

/**
 * API response type helpers.
 */
export type StatusResponse = z.infer<typeof statusSchema>;
export type ErrorLogResponse = z.infer<typeof errorLogSchema>;
export type AccessLogResponse = z.infer<typeof accessLogResponseSchema>;
