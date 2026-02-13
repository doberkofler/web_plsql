import {Router, type Request, type Response, type NextFunction, type RequestHandler} from 'express';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import expressStaticGzip from 'express-static-gzip';
import type {AdminContext} from '../server/adminContext.ts';
import {createAdminRouter} from './handlerAdmin.ts';

/**
 * Resolves the admin console static directory by walking up from the current module
 * to find the project root (identified by package.json), then returns dist/frontend path.
 * @returns Path to dist/frontend directory
 * @throws {Error} if project root cannot be found
 */
export const resolveAdminStaticDir = (): string => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);

	let projectRoot = __dirname;
	while (!existsSync(path.join(projectRoot, 'package.json')) && projectRoot !== '/') {
		projectRoot = path.dirname(projectRoot);
	}

	if (projectRoot === '/') {
		throw new Error('Could not find project root (package.json). Please provide explicit staticDir in AdminConsoleConfig.');
	}

	return path.join(projectRoot, 'dist', 'frontend');
};

export type AdminConsoleConfig = {
	/** Base route for the admin console (defaults to '/admin') */
	adminRoute?: string | undefined;
	/** Path to built admin frontend directory (optional - auto-detects if omitted) */
	staticDir?: string | undefined;
	/** Optional username for basic auth */
	user?: string | undefined;
	/** Optional password for basic auth */
	password?: string | undefined;
	/** Skip static dir validation (for dev mode) */
	devMode?: boolean | undefined;
};

/**
 * Creates the admin console middleware.
 * @param config - The admin console configuration.
 * @param adminContext - The admin context.
 * @returns The express request handler.
 */
export const handlerAdminConsole = (config: AdminConsoleConfig, adminContext: AdminContext): RequestHandler => {
	const adminRoute = config.adminRoute ?? '/admin';
	const resolvedStaticDir = config.staticDir ?? resolveAdminStaticDir();

	// Validation
	if (adminRoute && !adminRoute.startsWith('/')) {
		throw new Error('adminRoute must start with /');
	}

	if (!config.devMode && !existsSync(resolvedStaticDir)) {
		throw new Error(`Admin console not built. Run 'npm run build:frontend' first.\nExpected: ${resolvedStaticDir}`);
	}

	// StatsManager hook
	const originalRotate = adminContext.statsManager.rotateBucket.bind(adminContext.statsManager);
	adminContext.statsManager.rotateBucket = () => {
		const poolSnapshots = adminContext.pools.map((pool, index) => {
			const cache = adminContext.caches[index];
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

	const router = Router();

	// Pause middleware
	router.use((req: Request, res: Response, next: NextFunction) => {
		if (adminContext.paused && !req.path.startsWith(adminRoute)) {
			res.status(503).send('Server Paused');
			return;
		}
		next();
	});

	// Route filter - all following middleware only apply to adminRoute
	router.use(adminRoute, (req: Request, res: Response, next: NextFunction) => {
		// Trailing slash redirect
		const baseUrl = req.baseUrl || '';
		const [path] = req.originalUrl.split('?');

		if (path === baseUrl) {
			const query = req.originalUrl.split('?')[1];
			return res.redirect(baseUrl + '/' + (query ? '?' + query : ''));
		}
		next();
	});

	// Auth middleware
	if (config.user && config.password) {
		router.use(adminRoute, (req: Request, res: Response, next: NextFunction) => {
			const b64auth = (req.headers.authorization ?? '').split(' ')[1] ?? '';
			const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

			if (login !== config.user || password !== config.password) {
				res.set('WWW-Authenticate', 'Basic realm="Admin Console"');
				res.status(401).send('Authentication required.');
				return;
			}
			next();
		});
	}

	// Mount handlerAdmin API routes
	router.use(adminRoute, createAdminRouter(adminContext));

	// Mount static files
	if (existsSync(resolvedStaticDir)) {
		router.use(
			adminRoute,
			expressStaticGzip(resolvedStaticDir, {
				enableBrotli: true,
				orderPreference: ['br'],
			}),
		);
	}

	return router;
};
