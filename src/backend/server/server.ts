import debugModule from 'debug';
const debug = debugModule('webplsql:server');
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import express, {type Express, type Request, type Response, type NextFunction} from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import expressStaticGzip from 'express-static-gzip';
import {z$configType, type configType, type configPlSqlType} from '../types.ts';
import {installShutdown} from '../util/shutdown.ts';
import {poolCreate, poolsClose, type Pool} from '../util/oracle.ts';
import {handlerUpload} from '../handler/handlerUpload.ts';
import {handlerLogger} from '../handler/handlerLogger.ts';
import {handlerWebPlSql} from '../handler/plsql/handlerPlSql.ts';
import {handlerAdmin} from '../handler/handlerAdmin.ts';
import {readFileSyncUtf8, getJsonFile} from '../util/file.ts';
import {showConfig} from './config.ts';
import {AdminContext} from './adminContext.ts';
import type {Socket} from 'node:net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type webServer = {
	config: configType;
	connectionPools: Pool[];
	app: Express;
	server: http.Server | https.Server;
	shutdown: () => Promise<void>;
};

export type sslConfig = {
	keyFilename: string;
	certFilename: string;
};

/**
 * Create HTTPS server.
 * @param app - express application
 * @param ssl - ssl configuration.
 * @returns server
 */
export const createServer = (app: Express, ssl?: sslConfig): http.Server | https.Server => {
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
 * @param config - The config.
 * @param ssl - ssl configuration.
 * @returns Promise resolving to the web server object.
 */
export const startServer = async (config: configType, ssl?: sslConfig): Promise<webServer> => {
	debug('startServer: BEGIN', config, ssl);

	const internalConfig = z$configType.parse(config);
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
	app.use((req: Request, res: Response, next: NextFunction) => {
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

	// Admin frontend must be built by vite into dist/frontend
	// Find project root by walking up from __dirname (works in both src/ and dist/)
	let projectRoot = __dirname;
	while (!existsSync(path.join(projectRoot, 'package.json')) && projectRoot !== '/') {
		projectRoot = path.dirname(projectRoot);
	}
	const adminDirectory = path.join(projectRoot, 'dist', 'frontend');
	if (!existsSync(adminDirectory)) {
		throw new Error(`Admin console not built. Run 'npm run build:frontend' first.\nExpected: ${adminDirectory}`);
	}
	debug(`Admin directory: ${adminDirectory}`);

	// Ensure trailing slash for admin route to support relative paths
	app.get(adminRoute, (req: Request, res: Response, next: NextFunction) => {
		const [path] = req.originalUrl.split('?');
		if (path === adminRoute) {
			const query = req.originalUrl.split('?')[1];
			return res.redirect(adminRoute + '/' + (query ? '?' + query : ''));
		}
		next();
	});

	app.use(adminRoute, handlerAdmin);
	app.use(
		adminRoute,
		expressStaticGzip(adminDirectory, {
			enableBrotli: true,
			orderPreference: ['br'],
		}),
	);

	// Serving static files
	for (const i of internalConfig.routeStatic) {
		app.use(
			i.route,
			expressStaticGzip(i.directoryPath, {
				enableBrotli: true,
				orderPreference: ['br'],
			}),
		);
	}

	const connectionPools: Pool[] = [];
	AdminContext.pools = connectionPools;
	AdminContext.caches = [];

	// Oracle pl/sql express middleware
	for (const i of internalConfig.routePlSql) {
		// Allocate the Oracle database pool
		const pool = await poolCreate(i.user, i.password, i.connectString);
		connectionPools.push(pool);

		const {defaultPage, pathAlias, pathAliasProcedure, documentTable, exclusionList, requestValidationFunction, transactionMode, errorStyle, cgi} =
			i as configPlSqlType;
		const handler = handlerWebPlSql(pool, {
			defaultPage,
			pathAlias,
			pathAliasProcedure,
			documentTable,
			exclusionList,
			requestValidationFunction,
			transactionMode,
			errorStyle,
			cgi,
		});

		// Capture caches for admin console
		AdminContext.caches.push({
			poolName: i.route,
			procedureNameCache: handler.procedureNameCache,
			argumentCache: handler.argumentCache,
		});

		app.use([`${i.route}/:name`, i.route], (req: Request, res: Response, next: NextFunction) => {
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
	const connections = new Set<Socket>();
	server.on('connection', (socket: Socket) => {
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
	await new Promise<void>((resolve, reject) => {
		server
			.listen(internalConfig.port)
			.on('listening', () => {
				debug('startServer: listener running');
				resolve();
			})
			.on('error', (err: NodeJS.ErrnoException) => {
				if ('code' in err) {
					if (err.code === 'EADDRINUSE') {
						err.message = `Port ${internalConfig.port} is already in use`;
					} else if (err.code === 'EACCES') {
						err.message = `Port ${internalConfig.port} requires elevated privileges`;
					}
				}
				reject(err);
			});
	});

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
 * @param filename - The configuration filename.
 * @returns Promise.
 */
export const loadConfig = (filename = 'config.json'): configType => z$configType.parse(getJsonFile(filename));

/**
 * Start server from config file.
 * @param filename - The configuration filename.
 * @param ssl - ssl configuration.
 * @returns Promise resolving to the web server object.
 */
export const startServerConfig = async (filename = 'config.json', ssl?: sslConfig): Promise<webServer> => startServer(loadConfig(filename), ssl);
