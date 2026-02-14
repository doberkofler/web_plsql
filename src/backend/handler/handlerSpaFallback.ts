import path from 'node:path';
import {type Request, type Response, type NextFunction, type RequestHandler} from 'express';

/**
 * Creates middleware that serves index.html for SPA routes.
 *
 * Handles React Router (createBrowserRouter), Vue Router, Angular Router, etc.
 *
 * **CRITICAL**: This middleware MUST be mounted AFTER express-static-gzip.
 *
 * Middleware order:
 * 1. express-static-gzip → Serves actual files (CSS, JS, images)
 * 2. handlerSpaFallback → Serves index.html for navigation requests
 *
 * @param directoryPath - Path to the static directory containing index.html
 * @param _route - The route prefix (for debugging)
 * @returns Express request handler
 *
 * @example
 * ```typescript
 * app.use('/app', expressStaticGzip('./build'));
 * app.use('/app', createSpaFallback('./build', '/app'));
 * ```
 */
export const createSpaFallback = (directoryPath: string, _route: string): RequestHandler => {
	const indexPath = path.join(directoryPath, 'index.html');

	return (req: Request, res: Response, next: NextFunction): void => {
		// Only handle GET/HEAD requests (standard browser navigation)
		if (req.method !== 'GET' && req.method !== 'HEAD') {
			return next();
		}

		// Check Accept header to avoid serving HTML for API/asset requests
		const accept = req.headers.accept ?? '';

		// Skip if Accept header explicitly excludes HTML
		// Handles: Accept: application/json, image/*, text/css, etc.
		if (accept && !accept.includes('text/html') && !accept.includes('*/*')) {
			return next();
		}

		// Send index.html for navigation requests
		res.sendFile(indexPath, (err) => {
			if (err) {
				// index.html missing - let Express handle 404
				next(err);
			}
		});
	};
};
