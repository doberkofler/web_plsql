import debugModule from 'debug';
const debug = debugModule('webplsql:server');

import http from 'node:http';
import https from 'node:https';
import type {Socket} from 'node:net';

import express, {type Express, type Request, type Response, type NextFunction} from 'express';
import type {Pool} from 'oracledb';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import expressStaticGzip from 'express-static-gzip';

import {
	handlerWebPlSql,
	handlerUpload,
	handlerLogger,
	AdminContext,
	showConfig,
	readFileSyncUtf8,
	getJsonFile,
	installShutdown,
	z$configType,
	type configType,
	type configPlSqlType,
	type PoolCacheEntry,
	oracledb,
} from '../index.ts';
import {handlerAdminConsole} from '../handler/handlerAdminConsole.ts';

/**
 * Close multiple pools.
 * @param pools - The pools to close.
 */
export const poolsClose = async (pools: Pool[]): Promise<void> => {
	await Promise.all(pools.map((pool) => pool.close(0)));
};

export type webServer = {
	config: configType;
	connectionPools: Pool[];
	app: Express;
	server: http.Server | https.Server;
	adminContext: AdminContext;
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

	showConfig(internalConfig);

	// Create express app
	const app = express();

	// Default middleware
	if (internalConfig.devMode) {
		app.use(
			cors({
				origin: 'http://localhost:5173',
				credentials: true,
			}),
		);
	}
	app.use(handlerUpload(internalConfig.uploadFileSizeLimit));
	app.use(express.json({limit: '50mb'}));
	app.use(express.urlencoded({limit: '50mb', extended: true}));
	app.use(cookieParser());
	app.use(compression());

	// Admin console route
	const adminRoute = internalConfig.adminRoute ?? '/admin';

	const connectionPools: Pool[] = [];
	const caches: PoolCacheEntry[] = [];

	// Oracle pl/sql express middleware
	const plsqlHandlers: {route: string; handler: ReturnType<typeof handlerWebPlSql>}[] = [];

	for (const i of internalConfig.routePlSql) {
		// Allocate the Oracle database pool
		const pool = await oracledb.createPool({
			user: i.user,
			password: i.password,
			connectString: i.connectString,
		});
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

		plsqlHandlers.push({route: i.route, handler});

		// Capture caches for admin console
		caches.push({
			poolName: i.route,
			procedureNameCache: handler.procedureNameCache,
			argumentCache: handler.argumentCache,
		});
	}

	// Create AdminContext
	const adminContext = new AdminContext(internalConfig, connectionPools, caches);

	// Pause & Admin Auth middleware
	app.use((req: Request, res: Response, next: NextFunction) => {
		// Simple pause check for all PL/SQL routes (not admin)
		if (adminContext.paused && !req.path.startsWith(adminRoute)) {
			res.status(503).send('Server Paused');
			return;
		}

		next();
	});

	// Access log
	if (internalConfig.loggerFilename.length > 0) {
		app.use(handlerLogger(internalConfig.loggerFilename));
	}

	// Mount Admin Console
	app.use(
		handlerAdminConsole(
			{
				adminRoute,
				user: internalConfig.adminUser,
				password: internalConfig.adminPassword,
				devMode: internalConfig.devMode,
			},
			adminContext,
		),
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

	// Mount PL/SQL handlers with stats tracking
	for (const {route, handler} of plsqlHandlers) {
		app.use([`${route}/:name`, route], (req: Request, res: Response, next: NextFunction) => {
			const start = process.hrtime();
			res.on('finish', () => {
				const diff = process.hrtime(start);
				const duration = diff[0] * 1000 + diff[1] / 1_000_000;
				adminContext.statsManager.recordRequest(duration, res.statusCode >= 400);
			});
			handler(req, res, next);
		});
	}

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

		adminContext.statsManager.stop();

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
		adminContext,
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
