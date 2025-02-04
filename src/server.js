import debugModule from 'debug';
const debug = debugModule('webplsql:server');

import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import {installShutdown} from './shutdown.js';
import {writeAfterEraseLine} from './util.js';
import {poolCreate, poolClose} from '../src/oracle.js';
import {getUploadMiddleware} from './handlerUpload.js';
import {handlerLogger} from './handlerLogger.js';
import {initMetrics, handlerMetrics} from './handlerMetrics.js';
import webplsql from './handlerPlSql.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 * @typedef {import('oracledb').Pool} Pool
 * @typedef {import('./types.js').environmentType} environmentType
 * @typedef {import('./types.js').configType} configType
 */

/**
 * Start generic server.
 * @param {configType} options - The server options.
 * @returns {Promise<void>} - Promise.
 */
export const server = async (options) => {
	debug('options', options);

	// Allocate the Oracle database pool
	const connectionPool = await poolCreate(options.user, options.password, options.connectString);

	// Install shutdown handler
	installShutdown(async () => {
		// Close database pool.
		await poolClose(connectionPool);

		// Close server
		return new Promise((resolve) => server.close(() => resolve()));
	});

	// Create express app
	const app = express();

	// Metrics
	const metrics = initMetrics();
	app.use(handlerMetrics(metrics));

	// Serving static files
	app.use(options.routeStatic, express.static(options.routeStaticPath));

	// Default middleware
	app.use(getUploadMiddleware());
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(cookieParser());
	app.use(compression());

	// Access log
	if (options.loggerFilename.length > 0) {
		app.use(handlerLogger(options.loggerFilename));
	}

	// Oracle pl/sql express middleware
	app.use(
		`${options.routeApp}/:name?`,
		webplsql(connectionPool, {
			defaultPage: options.defaultPage,
			pathAlias: options.pathAlias,
			doctable: options.documentTable,
			errorStyle: options.errorStyle,
		}),
	);

	// Update metrics every second
	if (options.monitorConsole) {
		setInterval(() => {
			// Update requests per second
			const requestsLastSecond = metrics.requestsInCurrentSecond;
			metrics.requestsInCurrentSecond = 0;

			// Clear console and display metrics
			writeAfterEraseLine(`Total requests: ${metrics.totalRequests}, requests in last second: ${requestsLastSecond}`);
		}, 1000);
	}

	// listen on port
	const server = app.listen(options.port);
};
