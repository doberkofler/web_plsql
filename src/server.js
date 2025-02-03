import debugModule from 'debug';
const debug = debugModule('webplsql:server');

import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import expressStatusMonitor from 'express-status-monitor';
import {installShutdown} from './shutdown.js';
import {writeAfterEraseLine} from './util.js';
import {poolCreate, poolClose} from '../src/oracle.js';
import {getUploadMiddleware} from '../src/uploadMiddleware.js';
import webplsql from './middleware.js';

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 * @typedef {import('oracledb').Pool} Pool
 * @typedef {import('./types.js').environmentType} environmentType
 * @typedef {import('./types.js').configType} configType
 */

const ACCESS_LOG_FILENAME = 'access.log';

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

	// Serving static files
	console.log(`Serving static files on http://localhost:${options.port}${options.routeStatic} from ${options.routeStaticPath}`);
	app.use(options.routeStatic, express.static(options.routeStaticPath));

	// Middleware to calculate request duration
	let totalRequests = 0;
	let requestsInCurrentSecond = 0;
	app.use((req, res, next) => {
		totalRequests++;
		requestsInCurrentSecond++;

		if (debug.enabled) {
			const start = process.hrtime();
			res.on('finish', () => {
				const [seconds, nanoseconds] = process.hrtime(start);
				const duration = seconds * 1000 + nanoseconds / 1_000_000;
				debug(`Request to ${req.params?.name} ${req.url} took ${duration.toFixed(3)}ms`);
			});
		}

		next();
	});

	// Default middleware
	app.use(getUploadMiddleware());
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(cookieParser());
	app.use(compression());

	// Access log
	if (options.logger) {
		app.use(morgan('combined', {stream: fs.createWriteStream(path.join(process.cwd(), ACCESS_LOG_FILENAME), {flags: 'a'})}));
		console.log(`Requests are logged to the file ${ACCESS_LOG_FILENAME}`);
	}

	// Express status monitor
	if (options.monitorRemote) {
		app.use(expressStatusMonitor());
		console.log(`Express status monitor is listening on http://localhost:${options.port}/status`);
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
			const requestsLastSecond = requestsInCurrentSecond;
			requestsInCurrentSecond = 0;

			// Clear console and display metrics
			writeAfterEraseLine(`Total requests: ${totalRequests}, requests in last second: ${requestsLastSecond}`);
		}, 1000);
	}

	// listen on port
	console.log(`Listening on http://localhost:${options.port}${options.routeApp}`);
	const server = app.listen(options.port);
};
