import z from 'zod';

/**
 * Configuration for serving static files
 */
export const configStaticSchema = z.strictObject({
	/** URL route prefix for static assets */
	route: z.string(),
	/** Local filesystem path to the static assets directory */
	directoryPath: z.string(),
});
export type configStaticType = z.infer<typeof configStaticSchema>;
