import {z} from 'zod';

export const procedureTraceEntrySchema = z.strictObject({
	id: z.string(),
	timestamp: z.string(),
	source: z.string(),
	url: z.string(),
	method: z.string(),
	status: z.string(),
	duration: z.number(),
	procedure: z.string().optional(),
	parameters: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]).optional(),
	uploads: z
		.array(
			z.strictObject({
				originalname: z.string(),
				mimetype: z.string(),
				size: z.number(),
			}),
		)
		.optional(),
	downloads: z
		.strictObject({
			fileType: z.string(),
			fileSize: z.number(),
		})
		.optional(),
	html: z.string().optional(),
	cookies: z.record(z.string(), z.string()).optional(),
	headers: z.record(z.string(), z.string()).optional(),
	cgi: z.record(z.string(), z.string()).optional(),
	error: z.string().optional(),
});

export type procedureTraceEntry = z.infer<typeof procedureTraceEntrySchema>;
