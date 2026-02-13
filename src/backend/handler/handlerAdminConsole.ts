import {Router, type Request, type Response, type NextFunction, type RequestHandler} from 'express';
import {existsSync} from 'node:fs';
import expressStaticGzip from 'express-static-gzip';
import type {AdminContext} from '../server/adminContext.ts';
import {createAdminRouter} from './handlerAdmin.ts';

export type AdminConsoleConfig = {
	/** Path to built admin frontend directory */
	staticDir: string;
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
	// Validation
	if (!config.devMode && !existsSync(config.staticDir)) {
		throw new Error(`Admin console not built. Run 'npm run build:frontend' first.\nExpected: ${config.staticDir}`);
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

	// Trailing slash redirect
	router.use((req: Request, res: Response, next: NextFunction) => {
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
		router.use((req: Request, res: Response, next: NextFunction) => {
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
	router.use(createAdminRouter(adminContext));

	// Mount static files
	if (existsSync(config.staticDir)) {
		router.use(
			expressStaticGzip(config.staticDir, {
				enableBrotli: true,
				orderPreference: ['br'],
			}),
		);
	}

	return router;
};
