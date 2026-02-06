/**
 * @typedef {object} CacheStats
 * @property {number} hits - The number of cache hits.
 * @property {number} misses - The number of cache misses.
 */

/**
 * @typedef {object} CacheInfo
 * @property {number} size - The number of entries in the cache.
 * @property {CacheStats} stats - Cache statistics.
 */

/**
 * @typedef {object} CacheData
 * @property {string} poolName - The name of the connection pool.
 * @property {CacheInfo} procedureNameCache - Procedure name cache info.
 * @property {CacheInfo} argumentCache - Argument cache info.
 */

/**
 * @typedef {object} PoolStats
 * @property {number} totalRequests - Total requests handled by the pool.
 * @property {number} totalTimeouts - Total request timeouts.
 * @property {number} [totalRequestsEnqueued] - Total requests enqueued.
 * @property {number} [totalRequestsDequeued] - Total requests dequeued.
 * @property {number} [totalRequestsFailed] - Total requests failed.
 */

/**
 * @typedef {object} PoolInfo
 * @property {string} name - The name of the pool.
 * @property {number} connectionsInUse - Connections currently in use.
 * @property {number} connectionsOpen - Total open connections.
 * @property {PoolStats | null} stats - Pool statistics.
 */

/**
 * @typedef {object} Metrics
 * @property {number} requestCount - Total requests.
 * @property {number} errorCount - Total errors.
 */

/**
 * @typedef {object} Status
 * @property {string} status - Server status (running, paused, etc.).
 * @property {number} uptime - Server uptime in seconds.
 * @property {string} startTime - Server start time ISO string.
 * @property {Metrics} metrics - Server metrics.
 * @property {PoolInfo[]} pools - Connection pool information.
 * @property {Record<string, unknown>} config - Server configuration.
 */

/**
 * @typedef {object} HistoryData
 * @property {string[]} labels - Time labels.
 * @property {number[]} requests - Request counts per second.
 * @property {number[]} errors - Error counts per second.
 * @property {Record<string, number[]>} poolUsage - Historical pool usage.
 */

/**
 * @typedef {object} ChartScale
 * @property {object} [grid] - The grid options.
 * @property {string} [grid.color] - The grid color.
 * @property {object} [ticks] - The ticks options.
 * @property {string} [ticks.color] - The ticks color.
 */

/**
 * @typedef {object} ChartOptions
 * @property {Record<string, ChartScale>} [scales] - The scale options.
 * @property {object} [plugins] - The plugins options.
 * @property {object} [plugins.legend] - The legend options.
 * @property {object} [plugins.legend.labels] - The legend labels options.
 * @property {string} [plugins.legend.labels.color] - The legend labels color.
 */

/**
 * @typedef {object} ChartDataset
 * @property {string} [label] - The dataset label.
 * @property {number[]} [data] - The dataset data.
 * @property {string} [borderColor] - The border color.
 * @property {string} [backgroundColor] - The background color.
 * @property {boolean} [fill] - Whether to fill the area under the line.
 * @property {number} [tension] - The line tension.
 */

/**
 * @typedef {object} ChartData
 * @property {string[]} labels - The chart labels.
 * @property {ChartDataset[]} datasets - The chart datasets.
 */

/**
 * @typedef {object} ChartInstance
 * @property {ChartData} data - The chart data.
 * @property {ChartOptions} options - The chart options.
 * @property {() => void} update - Method to update the chart.
 */

/**
 * @typedef {import('chart.js').Chart} Chart
 */

/**
 * @typedef {object} State
 * @property {string} currentView - The currently active view.
 * @property {Partial<Status>} status - The current server status.
 * @property {number} lastRequestCount - Request count from the last update.
 * @property {number} lastErrorCount - Error count from the last update.
 * @property {number} lastUpdateTime - Timestamp of the last update.
 * @property {ReturnType<setInterval> | null} refreshTimer - The auto-refresh timer.
 * @property {HistoryData} history - Historical data for charts.
 * @property {Record<string, Chart>} charts - Chart instances.
 */

/**
 * @typedef {object} ErrorLog
 * @property {string} timestamp - Timestamp of the error.
 * @property {object} [req] - Request information.
 * @property {string} [req.method] - HTTP method.
 * @property {string} [req.url] - Request URL.
 * @property {string} message - Error message.
 * @property {object} [details] - Detailed error information.
 * @property {string} [details.fullMessage] - Full error message.
 */

export {};
