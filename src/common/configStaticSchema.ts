import z from 'zod';

/**
 * Configuration for serving static files
 */
export const configStaticSchema = z.strictObject({
	/** URL route prefix for static assets */
	route: z.string(),
	/** Local filesystem path to the static assets directory */
	directoryPath: z.string(),
	/**
	 * Enable SPA fallback mode.
	 * When true, serves index.html for unmatched routes (for React Router, Vue Router, etc.)
	 * Requires: Application uses HTML5 History Mode routing
	 * Default: false
	 */
	spaFallback: z.boolean().optional(),
});
export type configStaticType = z.infer<typeof configStaticSchema>;
