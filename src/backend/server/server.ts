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

// NOTE: it is only allowed to import from the API './index.ts'
import {
	handlerWebPlSql,
	handlerAdminConsole,
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
	oracledb,
} from '../index.ts';

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

	// Create AdminContext
	const adminContext = new AdminContext(internalConfig);

	// Mount Admin Console (includes Pause middleware)
	app.use(
		handlerAdminConsole(
			{
				adminRoute: internalConfig.adminRoute,
				user: internalConfig.adminUser,
				password: internalConfig.adminPassword,
				devMode: internalConfig.devMode,
			},
			adminContext,
		),
	);

	// Oracle pl/sql express middleware
	for (const i of internalConfig.routePlSql) {
		// Allocate the Oracle database pool
		const pool = await oracledb.createPool({
			user: i.user,
			password: i.password,
			connectString: i.connectString,
		});

		const handler = handlerWebPlSql(pool, i as configPlSqlType, adminContext);

		app.use([`${i.route}/:name`, i.route], (req: Request, res: Response, next: NextFunction) => {
			const start = process.hrtime();
			res.on('finish', () => {
				const diff = process.hrtime(start);
				const duration = diff[0] * 1000 + diff[1] / 1_000_000;
				adminContext.statsManager.recordRequest(duration, res.statusCode >= 400);
			});
			handler(req, res, next);
		});
	}

	// Access log
	if (internalConfig.loggerFilename.length > 0) {
		app.use(handlerLogger(internalConfig.loggerFilename));
	}

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
	// (already mounted in the loop above)

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

		await poolsClose(adminContext.pools);

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
		connectionPools: adminContext.pools,
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
