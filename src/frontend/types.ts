import type {StatusResponse, ErrorLogResponse} from './schemas.js';

// Re-export types from schemas
export type {StatusResponse, ErrorLogResponse};

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
 * Trace entry.
 */
export type TraceEntry = {
	id: string;
	timestamp: string;
	source: string;
	url: string;
	method: string;
	status: string;
	duration: number;
	procedure?: string | undefined;
	parameters?: Record<string, unknown> | unknown[] | undefined;
	uploads?: {originalname: string; mimetype: string; size: number}[] | undefined;
	downloads?:
		| {
				fileType: string;
				fileSize: number;
		  }
		| undefined;
	html?: string | undefined;
	cookies?: Record<string, string> | undefined;
	headers?: Record<string, string> | undefined;
	cgi?: Record<string, string> | undefined;
	error?: string | undefined;
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
