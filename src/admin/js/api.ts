import {z} from 'zod';
import {statusSchema, errorLogSchema, accessLogResponseSchema, type StatusResponse, type ErrorLogResponse, type AccessLogResponse} from './schemas.js';

/**
 * Validates response data against a Zod schema.
 *
 * @param data - The data to validate.
 * @param schema - The Zod schema to validate against.
 * @param path - The API path for error messages.
 * @returns The validated data.
 */
function validate<T>(data: unknown, schema: z.ZodType<T>, path: string): T {
	const result = schema.safeParse(data);
	if (!result.success) {
		throw new Error(`Validation failed for ${path}: ${result.error.message}`);
	}
	return result.data;
}

/**
 * Typed API client with Zod validation.
 */
export const typedApi = {
	/**
	 * Get server status with validation.
	 *
	 * @returns The validated status response.
	 */
	async getStatus(): Promise<StatusResponse> {
		const res = await fetch('api/status');
		if (!res.ok) throw new Error(`GET api/status failed: ${res.statusText}`);
		const data: unknown = await res.json();
		return validate(data, statusSchema, 'api/status');
	},

	/**
	 * Get error logs with validation.
	 *
	 * @returns The validated error log response.
	 */
	async getErrorLogs(): Promise<ErrorLogResponse[]> {
		const res = await fetch('api/logs/error');
		if (!res.ok) throw new Error(`GET api/logs/error failed: ${res.statusText}`);
		const data: unknown = await res.json();
		return validate(data, z.array(errorLogSchema), 'api/logs/error');
	},

	/**
	 * Get access logs with validation.
	 *
	 * @returns The validated access log response.
	 */
	async getAccessLogs(): Promise<AccessLogResponse> {
		const res = await fetch('api/logs/access');
		if (!res.ok) throw new Error(`GET api/logs/access failed: ${res.statusText}`);
		const data: unknown = await res.json();
		return validate(data, accessLogResponseSchema, 'api/logs/access');
	},

	/**
	 * POST to an endpoint without response validation.
	 *
	 * @param path - The API path.
	 * @param body - The request body.
	 */
	async post(path: string, body: object = {}): Promise<void> {
		const res = await fetch(path, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(body),
		});
		if (!res.ok) throw new Error(`POST ${path} failed: ${res.statusText}`);
	},
};
