import {z} from 'zod';
import {configStaticSchema} from '../common/configStaticSchema.ts';
export {logEntrySchema, type logEntryType} from '../common/logEntrySchema.ts';
export {type procedureTraceEntry} from '../common/procedureTraceEntry.ts';

/**
 * Cache statistics schema.
 */
const cacheStatsSchema = z.strictObject({
	size: z.number(),
	hits: z.number(),
	misses: z.number(),
});

/**
 * Pool cache snapshot schema.
 */
const poolCacheSnapshotSchema = z.strictObject({
	procedureName: cacheStatsSchema,
	argument: cacheStatsSchema,
});

/**
 * Pool statistics schema.
 */
const poolStatsSchema = z.strictObject({
	totalRequests: z.number(),
	totalTimeouts: z.number(),
	totalRequestsEnqueued: z.number().optional(),
	totalRequestsDequeued: z.number().optional(),
	totalRequestsFailed: z.number().optional(),
});

/**
 * Pool information schema.
 */
const poolInfoSchema = z.strictObject({
	name: z.string(),
	connectionsInUse: z.number(),
	connectionsOpen: z.number(),
	stats: poolStatsSchema.nullable(),
	cache: poolCacheSnapshotSchema.optional(),
});

/**
 * Server metrics schema.
 */
const metricsSchema = z.strictObject({
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
export const bucketSchema = z.strictObject({
	timestamp: z.number(),
	requests: z.number(),
	errors: z.number(),
	durationMin: z.number(),
	durationMax: z.number(),
	durationAvg: z.number(),
	durationP95: z.number(),
	durationP99: z.number(),
	system: z.strictObject({
		cpu: z.number(),
		heapUsed: z.number(),
		heapTotal: z.number(),
		rss: z.number(),
		external: z.number(),
	}),
	pools: z.array(
		z.strictObject({
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
const routeConfigSchema = z.strictObject({
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
const serverConfigSchema = z.strictObject({
	port: z.number(),
	adminRoute: z.string().optional(),
	adminUser: z.string().optional(),
	adminPassword: z.string().optional(),
	loggerFilename: z.string(),
	uploadFileSizeLimit: z.number().optional(),
	routePlSql: z.array(routeConfigSchema),
	routeStatic: z.array(configStaticSchema),
});

/**
 * System information schema.
 */
const systemInfoSchema = z.strictObject({
	nodeVersion: z.string(),
	platform: z.string(),
	arch: z.string(),
	cpuCores: z.number().optional(),
	memory: z.strictObject({
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
	cpu: z.strictObject({
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
export const statusSchema = z.strictObject({
	version: z.string(),
	status: z.enum(['running', 'paused', 'stopped']),
	uptime: z.number(),
	startTime: z.string(),
	intervalMs: z.number().optional(),
	metrics: metricsSchema,
	history: z.array(bucketSchema).optional(),
	pools: z.array(poolInfoSchema),
	system: systemInfoSchema,
	config: serverConfigSchema.partial().nullable().optional(),
});

export const accessLogResponseSchema = z.union([z.array(z.string()), z.strictObject({message: z.string()})]);

/**
 * Trace entry schema.
 */
export const traceEntrySchema = z.strictObject({
	id: z.string(),
	timestamp: z.string(),
	source: z.string(),
	url: z.string(),
	method: z.string(),
	status: z.string(),
	duration: z.number(),
	procedure: z.string().optional(),
	parameters: z.record(z.string(), z.any()).optional(),
	uploads: z.array(z.any()).optional(),
	downloads: z
		.strictObject({
			fileType: z.string(),
			fileSize: z.number(),
		})
		.optional(),
	html: z.string().optional(),
	cookies: z.record(z.string(), z.string()).optional(),
	headers: z.record(z.string(), z.string()).optional(),
	cgi: z.record(z.string(), z.string()).optional(),
	error: z.string().optional(),
});

/**
 * API response type helpers.
 */
export type StatusResponse = z.infer<typeof statusSchema>;
export type AccessLogResponse = z.infer<typeof accessLogResponseSchema>;

/**
 * Server configuration - route.
 */
export type RouteConfig = {
	route: string;
	// PL/SQL specific
	user?: string;
	password?: string;
	connectString?: string;
	defaultPage?: string;
	pathAlias?: string;
	pathAliasProcedure?: string;
	documentTable?: string;
	exclusionList?: string[];
	requestValidationFunction?: string;
	transactionMode?: unknown;
	errorStyle?: string;
	// Static specific
	directoryPath?: string;
};

/**
 * Server configuration.
 */
export type ServerConfig = {
	port: number;
	adminRoute?: string;
	adminUser?: string;
	adminPassword?: string;
	loggerFilename: string;
	uploadFileSizeLimit?: number;
	routePlSql: RouteConfig[];
	routeStatic: RouteConfig[];
};

/**
 * Resident Set Size - total memory used by the process
 */
export type HistoryBucket = {
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
	pools: {
		name: string;
		connectionsInUse: number;
		connectionsOpen: number;
	}[];
};

/**
 * Historical data for charts.
 */
type HistoryData = {
	labels: string[];
	requests: number[];
	avgResponseTimes: number[];
	p95ResponseTimes?: number[];
	p99ResponseTimes?: number[];
	poolUsage: Record<string, number[]>;
};

/**
 * Chart grid options.
 */
type ChartGridOptions = {
	color?: string;
	display?: boolean;
	drawBorder?: boolean;
	drawOnChartArea?: boolean;
};

/**
 * Chart ticks options.
 */
type ChartTicksOptions = {
	color?: string;
	display?: boolean;
	stepSize?: number;
	maxRotation?: number;
	autoSkip?: boolean;
	maxTicksLimit?: number;
	callback?: (value: number | string) => string;
};

/**
 * Chart scale options.
 */
type ChartScaleOptions = {
	display?: boolean;
	grid?: ChartGridOptions;
	ticks?: ChartTicksOptions;
	border?: {
		display?: boolean;
		color?: string;
	};
	title?: {
		display: boolean;
		text: string;
		color: string;
	};
	type?: string;
	position?: string;
	beginAtZero?: boolean;
	max?: number;
};

/**
 * Chart options.
 */
type ChartOptions = {
	responsive?: boolean;
	maintainAspectRatio?: boolean;
	scales?: {
		x?: ChartScaleOptions;
		y?: ChartScaleOptions;
		y1?: ChartScaleOptions;
	};
	layout?: {
		padding?: number;
	};
	plugins?: {
		legend?: {
			display?: boolean;
			labels?: {
				color?: string;
			};
		};
		tooltip?: {
			enabled?: boolean;
			position?: string;
			intersect?: boolean;
			callbacks?: Record<string, unknown>;
		};
	};
	elements?: {
		point?: {
			radius?: number;
		};
		line?: {
			borderWidth?: number;
		};
		bar?: {
			borderWidth?: number;
		};
	};
};

/**
 * Chart dataset.
 */
type ChartDataset = {
	label: string;
	data: number[];
	borderColor: string;
	backgroundColor: string | undefined;
	fill?: boolean | undefined;
	tension?: number | undefined;
	barThickness?: number;
	categoryPercentage?: number;
	barPercentage?: number;
	borderWidth?: number;
	yAxisID?: string;
};

/**
 * Chart data.
 */
type ChartData = {
	labels: string[];
	datasets: ChartDataset[];
};

/**
 * Chart instance interface.
 */
export type ChartInstance = {
	data: ChartData;
	options: ChartOptions;
	update: () => void;
};

/**
 * System metrics for tracking min/max.
 */
export type SystemMetrics = {
	heapUsed: number;
	heapTotal: number;
	rss: number;
	external: number;
	cpuUser: number;
	cpuSystem: number;
};

/**
 * Application state.
 */
export type State = {
	currentView: string;
	status: Partial<StatusResponse>;
	maxHistoryPoints: number;
	lastRequestCount: number;
	lastErrorCount: number;
	lastUpdateTime: number;
	lastBucketTimestamp: number;
	nextRefreshTimeout: ReturnType<typeof setTimeout> | null;
	nextRefreshTime: number;
	countdownInterval: ReturnType<typeof setInterval> | null;
	history: HistoryData & {
		cpuUsage: number[];
		memoryUsage: number[];
	};
	charts: Record<string, ChartInstance>;
	metricsMin: Partial<SystemMetrics>;
	metricsMax: Partial<SystemMetrics>;
};

declare global {
	/** Injected by Vite during build */
	const __BUILD_TIME__: string;
}
