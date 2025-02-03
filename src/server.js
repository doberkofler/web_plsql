#!/usr/bin/env node

import debugModule from 'debug';
const debug = debugModule('webplsql:server');

import fs from 'node:fs';
import path from 'node:path';
import * as portfinder from 'portfinder';
import express from 'express';
import multer from 'multer';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import expressStatusMonitor from 'express-status-monitor';
import oracledb from 'oracledb';
import {getOptions} from './options.js';
import {installShutdown} from './shutdown.js';
import {writeAfterEraseLine} from './util.js';
import webplsql from './middleware.js';

const ACCESS_LOG_FILENAME = 'access.log';

const main = async () => {
	// Get command line options
	const config = await getOptions();
	debug('config', config);

	// Find port
	if (config.port === 0) {
		portfinder.setBasePort(80);
		config.port = await portfinder.getPortPromise();
		debug('calculated port', config.port);
	}

	// Allocate the Oracle database pool
	const connectionPool = await oracledb.createPool({
		user: config.user, // The database user name.
		password: config.password, // The password of the database user.
		connectString: config.connectString, // The Oracle database instance to connect to. The string can be an Easy Connect string, or a Net Service Name from a tnsnames.ora file, or the name of a local Oracle database instance.
		poolMin: 10, // The minimum number of connections a connection pool maintains, even when there is no activity to the target database.
		poolMax: 1000, // The maximum number of connections to which a connection pool can grow.
		poolIncrement: 10, // The number of connections that are opened whenever a connection request exceeds the number of currently open connections.
		queueTimeout: 1000, // The number of milliseconds after which connection requests waiting in the connection request queue are terminated. If queueTimeout is 0, then queued connection requests are never terminated.
	});

	// Install shutdown handler
	/**
	 * @returns {Promise<void>}
	 */
	const serverStop = () => new Promise((resolve) => server.close(() => resolve()));

	/**
	 * @returns {Promise<void>}
	 */
	const shutdownHandler = async () => {
		// Close database pool.
		await connectionPool.close(0);

		// Close server
		await serverStop();
	};
	installShutdown(shutdownHandler);

	// Create the upload middleware
	const upload = multer({
		storage: multer.diskStorage({
			destination: '/tmp/uploads',
			filename: (req, file, cb) => {
				const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
				cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
			},
		}),
		limits: {
			fileSize: 50 * 1024 * 1024, // 50MB limit
		},
	});

	// Create express app
	const app = express();

	// Serving static files
	console.log(`Serving static files on http://localhost:${config.port}${config.routeStatic} from ${config.routeStaticPath}`);
	app.use(config.routeStatic, express.static(config.routeStaticPath));

	// Middleware to calculate request duration
	app.use((req, res, next) => {
		totalRequests++;
		requestsInCurrentSecond++;

		const start = process.hrtime();
		res.on('finish', () => {
			const [seconds, nanoseconds] = process.hrtime(start);
			const duration = seconds * 1000 + nanoseconds / 1_000_000;
			debug(`Request to ${req.params?.name} ${req.url} took ${duration.toFixed(3)}ms`);
		});

		next();
	});

	// Default middleware
	app.use(upload.any());
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(cookieParser());
	app.use(compression());

	// Access log
	if (config.logger) {
		app.use(morgan('combined', {stream: fs.createWriteStream(path.join(process.cwd(), ACCESS_LOG_FILENAME), {flags: 'a'})}));
		console.log(`Requests are logged to the file ${ACCESS_LOG_FILENAME}`);
	}

	// Express status monitor
	if (config.monitorRemote) {
		app.use(expressStatusMonitor());
		console.log(`Express status monitor is listening on http://localhost:${config.port}/status`);
	}

	// Oracle pl/sql express middleware
	app.use(
		`${config.routeApp}/:name?`,
		webplsql(connectionPool, {
			defaultPage: config.defaultPage,
			pathAlias: config.pathAlias,
			doctable: config.documentTable,
			errorStyle: config.errorStyle,
		}),
	);

	// Update metrics every second
	let totalRequests = 0;
	let requestsInCurrentSecond = 0;
	if (config.monitorRemote) {
		setInterval(() => {
			// Update requests per second
			const requestsLastSecond = requestsInCurrentSecond;
			requestsInCurrentSecond = 0;

			// Clear console and display metrics
			writeAfterEraseLine(`Total requests: ${totalRequests}, requests in last second: ${requestsLastSecond}`);
		}, 1000);
	}

	// listen on port
	console.log(`Listening on http://localhost:${config.port}${config.routeApp}`);
	const server = app.listen(config.port);
};

void main();
