import debugModule from 'debug';
const debug = debugModule('webplsql:server');
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import {z$configType} from '../types.js';
import {installShutdown} from '../util/shutdown.js';
import {poolCreate, poolsClose} from '../util/oracle.js';
import {handlerUpload} from '../handler/handlerUpload.js';
import {handlerLogger} from '../handler/handlerLogger.js';
import {handlerWebPlSql} from '../handler/plsql/handlerPlSql.js';
import {handlerAdmin} from '../handler/handlerAdmin.js';
import {readFileSyncUtf8, getJsonFile} from '../util/file.js';
import {showConfig} from './config.js';
import {AdminContext} from './adminContext.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @typedef {import('node:net').Socket} Socket
 * @typedef {import('express').Express} Express
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 * @typedef {import('oracledb').Pool} Pool
 * @typedef {import('../types.js').environmentType} environmentType
 * @typedef {import('../types.js').configType} configType
 * @typedef {import('../handler/plsql/procedureNamed.js').argsType} argsType
 */

/**
 * @typedef {import('express').RequestHandler & {
 *   procedureNameCache: import('../util/cache.js').Cache<string>;
 *   argumentCache: import('../util/cache.js').Cache<argsType>;
 * }} ExtendedRequestHandler
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
	AdminContext.config = internalConfig;

	showConfig(internalConfig);

	// Create express app
	const app = express();

	// Default middleware
	app.use(handlerUpload(internalConfig.uploadFileSizeLimit));
	app.use(express.json({limit: '50mb'}));
	app.use(express.urlencoded({limit: '50mb', extended: true}));
	app.use(cookieParser());
	app.use(compression());

	// Pause & Admin Auth middleware
	app.use((req, res, next) => {
		const adminRoute = internalConfig.adminRoute ?? '/admin';

		// Simple pause check for all PL/SQL routes (not admin)
		if (AdminContext.paused && !req.path.startsWith(adminRoute)) {
			res.status(503).send('Server Paused');
			return;
		}

		// Basic Auth for Admin Route
		if (req.path.startsWith(adminRoute)) {
			const user = internalConfig.adminUser;
			const pass = internalConfig.adminPassword;

			if (user && pass) {
				const auth = {login: user, password: pass};
				const b64auth = (req.headers.authorization ?? '').split(' ')[1] ?? '';
				const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

				if (login !== auth.login || password !== auth.password) {
					res.set('WWW-Authenticate', 'Basic realm="Admin Console"');
					res.status(401).send('Authentication required.');
					return;
				}
			}
		}

		next();
	});

	// Access log
	if (internalConfig.loggerFilename.length > 0) {
		app.use(handlerLogger(internalConfig.loggerFilename));
	}

	// Admin console
	const adminRoute = internalConfig.adminRoute ?? '/admin';
	const adminDirectory = path.resolve(__dirname, '../admin');

	// Ensure trailing slash for admin route to support relative paths
	app.get(adminRoute, (req, res, next) => {
		const [path] = req.originalUrl.split('?');
		if (path === adminRoute) {
			const query = req.originalUrl.split('?')[1];
			return res.redirect(adminRoute + '/' + (query ? '?' + query : ''));
		}
		next();
	});

	app.use(adminRoute, handlerAdmin);
	app.use(adminRoute, express.static(adminDirectory));

	// Serving static files
	for (const i of internalConfig.routeStatic) {
		app.use(i.route, express.static(i.directoryPath));
	}

	/** @type {Pool[]} */
	const connectionPools = [];
	AdminContext.pools = connectionPools;
	AdminContext.caches = [];

	// Oracle pl/sql express middleware
	for (const i of internalConfig.routePlSql) {
		// Allocate the Oracle database pool
		const pool = await poolCreate(i.user, i.password, i.connectString);
		connectionPools.push(pool);

		const handler = handlerWebPlSql(pool, i);

		// Capture caches for admin console
		AdminContext.caches.push({
			poolName: i.route,
			procedureNameCache: handler.procedureNameCache,
			argumentCache: handler.argumentCache,
		});

		app.use([`${i.route}/:name`, i.route], (req, res, next) => {
			const start = process.hrtime();
			res.on('finish', () => {
				const diff = process.hrtime(start);
				const duration = diff[0] * 1000 + diff[1] / 1_000_000;
				AdminContext.statsManager.recordRequest(duration, res.statusCode >= 400);
			});
			handler(req, res, next);
		});
	}

	// Update pools in StatsManager on each rotation
	const originalRotate = AdminContext.statsManager.rotateBucket.bind(AdminContext.statsManager);
	AdminContext.statsManager.rotateBucket = () => {
		const poolSnapshots = AdminContext.pools.map((pool, index) => {
			const cache = AdminContext.caches[index];
			const name = cache?.poolName ?? `pool-${index}`;
			const procStats = cache?.procedureNameCache.getStats();
			const argStats = cache?.argumentCache.getStats();

			return {
				name,
				connectionsOpen: pool.connectionsOpen,
				connectionsInUse: pool.connectionsInUse,
				cache: {
					procedureName: {
						size: cache?.procedureNameCache.keys().length ?? 0,
						hits: procStats?.hits ?? 0,
						misses: procStats?.misses ?? 0,
					},
					argument: {
						size: cache?.argumentCache.keys().length ?? 0,
						hits: argStats?.hits ?? 0,
						misses: argStats?.misses ?? 0,
					},
				},
			};
		});
		originalRotate(poolSnapshots);
	};

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

		AdminContext.statsManager.stop();

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
					if ('code' in err) {
						if (err.code === 'EADDRINUSE') {
							err.message = `Port ${internalConfig.port} is already in use`;
						} else if (err.code === 'EACCES') {
							err.message = `Port ${internalConfig.port} requires elevated privileges`;
						}
					}
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
