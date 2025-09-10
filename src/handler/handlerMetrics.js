import debugModule from 'debug';
const debug = debugModule('webplsql:handlerMetrics');

/**
 * @typedef {import('express').RequestHandler} RequestHandler
 */

/**
 * @typedef {object} metricsType
 * @property {Date} started - When was the server started.
 * @property {number} totalRequests - Total number of requests.
 * @property {number} totalRequestDuration - Total amount of time in ms in request.
 * @property {number} minRequestDuration - Min amount of time in ms in request.
 * @property {number} maxRequestDuration - Max amount of time in ms in request.
 */

/**
 * Convert hrtime to ms.
 * @param {[number, number]} hrtime - Time
 * @returns {number} Millisecoinds.
 */
const hrtime2ms = (hrtime) => hrtime[0] * 1000 + hrtime[1] / 1_000_000;

/**
 * metrics initializer.
 * @returns {metricsType} The metrics.
 */
export const initMetrics = () => {
	return {
		started: new Date(),
		totalRequests: 0,
		totalRequestDuration: 0,
		minRequestDuration: -1,
		maxRequestDuration: -1,
	};
};

/**
 * The metrics handler.
 * @param {metricsType} metrics - the nmetrics.
 * @returns {RequestHandler} - Request handler.
 */
export const handlerMetrics = (metrics) => {
	debug('register');

	return (req, res, next) => {
		metrics.totalRequests++;

		const start = hrtime2ms(process.hrtime());
		res.on('finish', () => {
			const duration = hrtime2ms(process.hrtime()) - start;

			metrics.totalRequestDuration += duration;
			if (metrics.minRequestDuration < 0 || duration < metrics.minRequestDuration) {
				metrics.minRequestDuration = duration;
			}
			if (metrics.maxRequestDuration < 0 || duration > metrics.maxRequestDuration) {
				metrics.maxRequestDuration = duration;
			}

			if (debug.enabled) {
				debug(`Request to ${req.params?.name} ${req.url} took ${duration.toFixed(3)}ms`);
			}
		});

		next();
	};
};
