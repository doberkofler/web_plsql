import debugModule from 'debug';
const debug = debugModule('webplsql:server');

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
import {getPackageVersion, getExpressVersion} from './version.js';
import {readFileSyncUtf8, getJsonFile} from './file.js';

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
 * @param {Pool[]} connectionPools - database connection
 * @returns {Promise<http.Server>} - server
 */
export const createHttpServer = (app, port, connectionPools) => {
	return new Promise((resolve) => {
		// Create server
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		const server = http.createServer({}, app);

		// Install shutdown handler
		installShutdown(async () => {
			// Close database pool.
			await poolsClose(connectionPools);

			// Close server
			return new Promise((resolve) => server.close(() => resolve()));
		});

		// Listen on HTTP ports
		server.listen(port, () => {
			resolve(server);
		});
	});
};

/**
 * Create HTTPS server.
 * @param {Express} app - express application
 * @param {string} sslKeyFilename - ssl
 * @param {string} sslCertFilename - ssl
 * @param {number} port - port number
 * @param {Pool[]} connectionPools - database connection
 * @returns {Promise<https.Server>} - server
 */
export const createHttpsServer = (app, sslKeyFilename, sslCertFilename, port, connectionPools) => {
	return new Promise((resolve) => {
		// Load certificates
		const key = readFileSyncUtf8(sslKeyFilename);
		const cert = readFileSyncUtf8(sslCertFilename);

		// Create server
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		const server = https.createServer({key, cert}, app);

		// Install shutdown handler
		installShutdown(async () => {
			// Close database pool.
			await poolsClose(connectionPools);

			// Close server
			return new Promise((resolve) => server.close(() => resolve()));
		});

		// Listen on HTTP ports
		server.listen(port, () => {
			resolve(server);
		});
	});
};

/**
 * Start HTTP server.
 * @param {configType} config - The config.
 * @returns {Promise<void>} - Promise.
 */
export const startHttpServer = async (config) => {
	debug('startHttpServer', config);

	const expressVersion = getExpressVersion();
	const packageVersion = getPackageVersion();

	config = z$configType.parse(config);

	console.log(`WEB_PL/SQL ${packageVersion} using express ${expressVersion}`);

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

	/** @type {Pool[]} */
	const connectionPools = [];

	// Oracle pl/sql express middleware
	for (const i of config.routePlSql) {
		// Allocate the Oracle database pool
		const pool = await poolCreate(i.user, i.password, i.connectString);
		connectionPools.push(pool);

		app.use([`${i.route}/:name`, i.route], handlerWebPlSql(pool, i));

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

	await createHttpServer(app, config.port, connectionPools);
};

/**
 * Load configuration.
 * @param {string} [filename] - The configuration filename.
 * @returns {configType} - Promise.
 */
export const loadConfig = (filename) => {
	debug('loadConfig', filename);

	if (typeof filename !== 'string' || filename.length === 0) {
		filename = 'config.json';
	}

	const data = getJsonFile(filename);

	const config = z$configType.parse(data);

	return config;
};
