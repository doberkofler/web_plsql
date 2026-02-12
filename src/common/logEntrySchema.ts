import {z} from 'zod';

/**
 * Error log entry schema.
 */
const logEntryTypeSchema = z.union([z.literal('error'), z.literal('info'), z.literal('warning')]);
export const logEntrySchema = z.strictObject({
	timestamp: z.string(),
	type: logEntryTypeSchema,
	message: z.string(),
	req: z
		.strictObject({
			method: z.string().optional(),
			url: z.string().optional(),
			ip: z.string().optional(),
			userAgent: z.string().optional(),
		})
		.optional(),
	details: z
		.strictObject({
			fullMessage: z.string().optional(),
			sql: z.string().optional(),
			bind: z.unknown().optional(),
			environment: z.record(z.string(), z.string()).optional(),
		})
		.optional(),
});
export type logEntryType = z.infer<typeof logEntrySchema>;
