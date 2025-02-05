import debugModule from 'debug';
const debug = debugModule('webplsql:server');

import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import {installShutdown} from './shutdown.js';
import {writeAfterEraseLine} from './util.js';
import {poolCreate, poolsClose} from '../src/oracle.js';
import {handlerUpload} from './handlerUpload.js';
import {handlerLogger} from './handlerLogger.js';
import {initMetrics, handlerMetrics} from './handlerMetrics.js';
import {handlerWebPlSql} from './handlerPlSql.js';
import {getPackageVersion} from './version.js';

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
 * @param {configType} config - The config.
 * @returns {Promise<void>} - Promise.
 */
export const startServer = async (config) => {
	debug('config', config);

	console.log(`WEB_PL/SQL ${getPackageVersion()}`);

	/** @type {Pool[]} */
	const pools = [];

	// Install shutdown handler
	installShutdown(async () => {
		// Close database pools.
		await poolsClose(pools);
		pools.length = 0;

		// Close server
		return new Promise((resolve) => server.close(() => resolve()));
	});

	// Create express app
	const app = express();

	// Metrics
	const metrics = initMetrics();
	app.use(handlerMetrics(metrics));

	// Serving static files
	for (const i of config.routeStatic) {
		app.use(i.route, express.static(i.directoryPath));
		console.log(`Static resources on "${i.route}" from directory ${i.directoryPath}`);
	}

	// Default middleware
	app.use(handlerUpload());
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(cookieParser());
	app.use(compression());

	// Access log
	if (config.loggerFilename.length > 0) {
		console.log(`Access log in "${config.loggerFilename}"`);
		app.use(handlerLogger(config.loggerFilename));
	}

	// Oracle pl/sql express middleware
	for (const i of config.routePlSql) {
		// Allocate the Oracle database pool
		const pool = await poolCreate(i.user, i.password, i.connectString);
		pools.push(pool);

		app.use(
			`${i.route}/:name?`,
			handlerWebPlSql(pool, {
				defaultPage: i.defaultPage,
				pathAlias: i.pathAlias,
				doctable: i.documentTable,
				errorStyle: config.errorStyle,
			}),
		);

		console.log(`Application route "http://localhost:${config.port}${i.route}"`);
		console.log(`   Oracle user:           ${i.user}`);
		console.log(`   Oracle server:         ${i.connectString}`);
		console.log(`   Oracle document table: ${i.documentTable}`);
	}

	// Update metrics every second
	if (config.monitorConsole) {
		setInterval(() => {
			// Update requests per second
			const requestsLastSecond = metrics.requestsInCurrentSecond;
			metrics.requestsInCurrentSecond = 0;

			// Clear console and display metrics
			writeAfterEraseLine(`Total requests: ${metrics.totalRequests}, requests per second: ${requestsLastSecond}`);
		}, 1000);
	}

	// listen on port
	const server = app.listen(config.port);
};
