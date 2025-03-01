import debugModule from 'debug';
const debug = debugModule('webplsql:server');

import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import {z$configType} from './types.js';
import {installShutdown} from './shutdown.js';
import {writeAfterEraseLine} from './tty.js';
import {poolCreate, poolsClose} from '../src/oracle.js';
import {handlerUpload} from './handlerUpload.js';
import {handlerLogger} from './handlerLogger.js';
import {initMetrics, handlerMetrics} from './handlerMetrics.js';
import {handlerWebPlSql} from './handlerPlSql.js';
import {getPackageVersion} from './version.js';
import {poolClose} from './oracle.js';

/**
 * @typedef {import('express').Express} Express
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 * @typedef {import('oracledb').Pool} Pool
 * @typedef {import('./types.js').environmentType} environmentType
 * @typedef {import('./types.js').configType} configType
 */

/**
 * Create HTTP server.
 * @param {Express} app - express application
 * @param {number} port - port number
 * @param {Pool} connectionPool - database connection
 * @returns {void}
 */
export const createHttpServer = (app, port, connectionPool) => {
	// Create server
	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	const server = http.createServer(app);

	// Install shutdown handler
	installShutdown(async () => {
		// Close database pool.
		await poolClose(connectionPool);

		// Close server
		return new Promise((resolve) => server.close(() => resolve()));
	});

	// Listen on HTTP ports
	server.listen(port, () => {
		console.log(`🚀 HTTP Server running at http://localhost:${port}`);
	});
};

/**
 * Create HTTPS server.
 * @param {Express} app - express application
 * @param {boolean} useSSL - ssl
 * @param {string} sslKeyFilename - ssl
 * @param {string} sslCertFilename - ssl
 * @param {number} port - port number
 * @param {Pool} connectionPool - database connection
 * @returns {void}
 */
export const createHttpsServer = (app, useSSL, sslKeyFilename, sslCertFilename, port, connectionPool) => {
	// Create server
	const key = fs.readFileSync(sslKeyFilename, 'utf8');
	const cert = fs.readFileSync(sslCertFilename, 'utf8');

	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	const server = https.createServer({key, cert}, app);

	// Install shutdown handler
	installShutdown(async () => {
		// Close database pool.
		await poolClose(connectionPool);

		// Close server
		return new Promise((resolve) => server.close(() => resolve()));
	});

	// Listen on HTTP ports
	server.listen(port, () => {
		console.log(`🚀 HTTPS Server running at http://localhost:${port}`);
	});
};

/**
 * Start generic server.
 * @param {configType} config - The config.
 * @returns {Promise<void>} - Promise.
 */
export const startServer = async (config) => {
	debug('startServer', config);

	config = z$configType.parse(config);

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

		app.use(`${i.route}/:name?`, handlerWebPlSql(pool, i));

		console.log(`Application route "http://localhost:${config.port}${i.route}"`);
		console.log(`   Oracle user:           ${i.user}`);
		console.log(`   Oracle server:         ${i.connectString}`);
		console.log(`   Oracle document table: ${i.documentTable}`);
	}

	// Update metrics every second
	if (config.monitorConsole) {
		setInterval(() => {
			// Update requests per second
			const requestsLastInterval = metrics.requestsInLastInterval;
			metrics.requestsInLastInterval = 0;

			// Clear console and display metrics
			writeAfterEraseLine(`Total requests: ${metrics.totalRequests}, requests per second: ${requestsLastInterval}`);
		}, 1000);
	}

	// listen on port
	const server = app.listen(config.port);
};
