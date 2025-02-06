import debugModule from 'debug';
const debug = debugModule('webplsql:handlerMetrics');

/**
 * @typedef {import('express').RequestHandler} RequestHandler
 * @typedef {import('./types.js').metricsType} metricsType
 */

/**
 * metrics initializer.
 * @returns {metricsType} The metrics.
 */
export const initMetrics = () => {
	return {
		totalRequests: 0,
		requestsInLastInterval: 0,
	};
};

/**
 * The metrics handler.
 * @param {metricsType} metrics - the nmetrics.
 * @returns {RequestHandler} - Request handler.
 */
export const handlerMetrics = (metrics) => {
	debug('register');

	metrics.totalRequests = 0;
	metrics.requestsInLastInterval = 0;

	return (req, res, next) => {
		metrics.totalRequests++;
		metrics.requestsInLastInterval++;

		if (debug.enabled) {
			const start = process.hrtime();
			res.on('finish', () => {
				const [seconds, nanoseconds] = process.hrtime(start);
				const duration = seconds * 1000 + nanoseconds / 1_000_000;
				debug(`Request to ${req.params?.name} ${req.url} took ${duration.toFixed(3)}ms`);
			});
		}

		next();
	};
};
