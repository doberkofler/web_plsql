import debugModule from 'debug';
const debug = debugModule('webplsql:server');

import http from 'node:http';
import https from 'node:https';
import express from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import {z$configType} from '../types.js';
import {installShutdown} from '../util/shutdown.js';
import {poolCreate, poolsClose} from '../util/oracle.js';
import {handlerUpload} from '../handler/handlerUpload.js';
import {handlerLogger} from '../handler/handlerLogger.js';
import {handlerWebPlSql} from '../handler/plsql/handlerPlSql.js';
import {readFileSyncUtf8, getJsonFile} from '../util/file.js';
import {showConfig} from './config.js';

/**
 * @typedef {import('node:net').Socket} Socket
 * @typedef {import('express').Express} Express
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 * @typedef {import('oracledb').Pool} Pool
 * @typedef {import('../types.js').environmentType} environmentType
 * @typedef {import('../types.js').configType} configType
 */

/**
 * @typedef {object} webServer - Web server interface.
 * @property {configType} config - Configuration object.
 * @property {Pool[]} connectionPools - Oracle connection pools.
 * @property {Express} app - Express app.
 * @property {http.Server | https.Server} server - Native Node http(s) server instance.
 * @property {() => Promise<void>} shutdown - Shutdown function.
 */

/**
 * @typedef {object} sslConfig - SSL configuration.
 * @property {string} keyFilename - key filename.
 * @property {string} certFilename - cert filename.
 */

/**
 * Create HTTPS server.
 * @param {Express} app - express application
 * @param {sslConfig} [ssl] - ssl configuration.
 * @returns {http.Server | https.Server} - server
 */
export const createServer = (app, ssl) => {
	if (ssl) {
		const key = readFileSyncUtf8(ssl.keyFilename);
		const cert = readFileSyncUtf8(ssl.certFilename);

		return https.createServer({key, cert}, app);
	} else {
		return http.createServer(app);
	}
};

/**
 * Start server.
 * @param {configType} config - The config.
 * @param {sslConfig} [ssl] - ssl configuration.
 * @returns {Promise<webServer>} - Promise resolving to the web server object.
 */
export const startServer = async (config, ssl) => {
	debug('startServer: BEGIN', config, ssl);

	const internalConfig = /** @type {configType} */ (z$configType.parse(config));

	showConfig(internalConfig);

	// Create express app
	const app = express();

	// Access log
	if (internalConfig.loggerFilename.length > 0) {
		app.use(handlerLogger(internalConfig.loggerFilename));
	}

	// Serving static files
	for (const i of internalConfig.routeStatic) {
		app.use(i.route, express.static(i.directoryPath));
	}

	// Default middleware
	app.use(handlerUpload(internalConfig.uploadFileSizeLimit));
	app.use(express.json());
	app.use(express.urlencoded({extended: true}));
	app.use(cookieParser());
	app.use(compression());

	/** @type {Pool[]} */
	const connectionPools = [];

	// Oracle pl/sql express middleware
	for (const i of internalConfig.routePlSql) {
		// Allocate the Oracle database pool
		const pool = await poolCreate(i.user, i.password, i.connectString);
		connectionPools.push(pool);

		app.use([`${i.route}/:name`, i.route], handlerWebPlSql(pool, i));
	}

	// create server
	debug('startServer: createServer');
	const server = createServer(app, ssl);

	// Track open connections
	/** @type {Set<Socket>} */
	const connections = new Set();
	server.on('connection', (/** @type {Socket} */ socket) => {
		connections.add(socket);
		socket.on('close', () => {
			connections.delete(socket);
		});
	});

	const closeAllConnections = () => {
		for (const socket of connections) {
			socket.destroy(); // forcibly closes the connection
			connections.delete(socket);
		}
	};

	const shutdown = async () => {
		debug('startServer: onShutdown');

		await poolsClose(connectionPools);

		server.close(() => {
			console.log('Server has closed');
			process.exit(0);
		});

		closeAllConnections();
	};

	// Install shutdown handler
	installShutdown(shutdown);

	// Listen
	debug('startServer: start listener');
	await /** @type {Promise<void>} */ (
		new Promise((resolve, reject) => {
			server
				.listen(internalConfig.port)
				.on('listening', () => {
					debug('startServer: listener running');
					resolve();
				})
				.on('error', (err) => {
					console.error(err);
					reject(err);
				});
		})
	);

	debug('startServer: END');

	return {
		config: internalConfig,
		connectionPools,
		app,
		server,
		shutdown,
	};
};

/**
 * Load configuration.
 * @param {string} [filename] - The configuration filename.
 * @returns {configType} - Promise.
 */
export const loadConfig = (filename = 'config.json') => /** @type {configType} */ (z$configType.parse(getJsonFile(filename)));

/**
 * Start server from config file.
 * @param {string} [filename] - The configuration filename.
 * @param {sslConfig} [ssl] - ssl configuration.
 * @returns {Promise<webServer>} - Promise resolving to the web server object.
 */
export const startServerConfig = async (filename = 'config.json', ssl) => startServer(loadConfig(filename), ssl);
