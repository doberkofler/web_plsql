import debugModule from 'debug';
const debug = debugModule('webplsql:server');

import http from 'node:http';
import https from 'node:https';
import express from 'express';
import bodyParser from 'body-parser';
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
 * @typedef {object} Server - server interface.
 * @property {http.Server | https.Server} server - native Node http(s) server instance.
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
		return http.createServer({}, app);
	}
};

/**
 * Start server.
 * @param {configType} config - The config.
 * @param {sslConfig} [ssl] - ssl configuration.
 * @returns {Promise<http.Server | https.Server>} - Promise resolving to the server.
 */
export const startServer = async (config, ssl) => {
	debug('startServer: BEGIN', config, ssl);

	config = z$configType.parse(config);

	showConfig(config);

	// Create express app
	const app = express();

	// Access log
	if (config.loggerFilename.length > 0) {
		app.use(handlerLogger(config.loggerFilename));
	}

	// Serving static files
	for (const i of config.routeStatic) {
		app.use(i.route, express.static(i.directoryPath));
	}

	// Default middleware
	app.use(handlerUpload());
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(cookieParser());
	app.use(compression());

	/** @type {Pool[]} */
	const connectionPools = [];

	// Oracle pl/sql express middleware
	for (const i of config.routePlSql) {
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

	const onShutdown = async () => {
		debug('startServer: onShutdown');

		await poolsClose(connectionPools);

		server.close(() => {
			console.log('Server has closed');
			process.exit(0);
		});

		closeAllConnections();
	};

	// Install shutdown handler
	installShutdown(onShutdown);

	// Listen
	debug('startServer: start listener');
	await /** @type {Promise<void>} */ (
		new Promise((resolve, reject) => {
			server
				.listen(config.port)
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

	return server;
};

/**
 * Load configuration.
 * @param {string} [filename] - The configuration filename.
 * @returns {configType} - Promise.
 */
export const loadConfig = (filename = 'config.json') => {
	debug('loadConfig', filename);

	const data = getJsonFile(filename);

	const config = z$configType.parse(data);

	return config;
};

/**
 * Start server from config file.
 * @param {string} [filename] - The configuration filename.
 * @param {sslConfig} [ssl] - ssl configuration.
 * @returns {Promise<http.Server | https.Server>} - Promise resolving to the server.
 */
export const startServerConfig = async (filename = 'config.json', ssl) => {
	const config = loadConfig(filename);

	return startServer(config, ssl);
};
