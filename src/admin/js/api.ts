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
 * Fetch with retry logic.
 *
 * @param url - The URL to fetch.
 * @param options - Fetch options.
 * @param retries - Number of retries (default 2).
 * @param delay - Delay between retries in ms (default 500).
 * @returns The response.
 */
async function fetchWithRetry(url: string, options?: RequestInit, retries = 2, delay = 500): Promise<Response> {
	for (let i = 0; i <= retries; i++) {
		try {
			const res = await fetch(url, options);
			return res;
		} catch (err) {
			if (i === retries) throw err;
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}
	throw new Error('Unreachable');
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
		const res = await fetchWithRetry('api/status');
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
		const res = await fetchWithRetry('api/logs/error');
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
		const res = await fetchWithRetry('api/logs/access');
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
		const res = await fetchWithRetry(path, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(body),
		});
		if (!res.ok) throw new Error(`POST ${path} failed: ${res.statusText}`);
	},
};
