import {z} from 'zod';
import {
	statusSchema,
	bucketSchema,
	errorLogSchema,
	accessLogResponseSchema,
	traceEntrySchema,
	type StatusResponse,
	type ErrorLogResponse,
	type AccessLogResponse,
} from './schemas.js';
import type {TraceEntry, HistoryBucket} from './types.js';

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
	 * @param includeHistory - Whether to include full history.
	 * @returns The validated status response.
	 */
	async getStatus(includeHistory = false): Promise<StatusResponse> {
		const res = await fetchWithRetry(`api/status?history=${includeHistory}`);
		if (!res.ok) throw new Error(`GET api/status failed: ${res.statusText}`);
		const data: unknown = await res.json();
		return validate(data, statusSchema, 'api/status');
	},

	/**
	 * Get stats history with validation.
	 *
	 * @param limit - Max number of entries.
	 * @returns The validated stats history.
	 */
	async getStatsHistory(limit = 100): Promise<HistoryBucket[]> {
		const query = new URLSearchParams({
			limit: limit.toString(),
		});
		const res = await fetchWithRetry(`api/stats/history?${query.toString()}`);
		if (!res.ok) throw new Error(`GET api/stats/history failed: ${res.statusText}`);
		const data: unknown = await res.json();
		return validate(data, z.array(bucketSchema), 'api/stats/history') as unknown as HistoryBucket[];
	},

	/**
	 * Get error logs with validation.
	 *
	 * @param limit - Max number of entries.
	 * @param filter - Optional filter string.
	 * @returns The validated error log response.
	 */
	async getErrorLogs(limit = 100, filter = ''): Promise<ErrorLogResponse[]> {
		const query = new URLSearchParams({
			limit: limit.toString(),
			filter,
		});
		const res = await fetchWithRetry(`api/logs/error?${query.toString()}`);
		if (!res.ok) throw new Error(`GET api/logs/error failed: ${res.statusText}`);
		const data: unknown = await res.json();
		return validate(data, z.array(errorLogSchema), 'api/logs/error');
	},

	/**
	 * Get access logs with validation.
	 *
	 * @param limit - Max number of entries.
	 * @param filter - Optional filter string.
	 * @returns The validated access log response.
	 */
	async getAccessLogs(limit = 100, filter = ''): Promise<AccessLogResponse> {
		const query = new URLSearchParams({
			limit: limit.toString(),
			filter,
		});
		const res = await fetchWithRetry(`api/logs/access?${query.toString()}`);
		if (!res.ok) throw new Error(`GET api/logs/access failed: ${res.statusText}`);
		const data: unknown = await res.json();
		return validate(data, accessLogResponseSchema, 'api/logs/access');
	},

	/**
	 * Get trace logs with validation.
	 *
	 * @param limit - Max number of entries.
	 * @param filter - Optional filter string.
	 * @returns The validated trace log response.
	 */
	async getTraceLogs(limit = 100, filter = ''): Promise<TraceEntry[]> {
		const query = new URLSearchParams({
			limit: limit.toString(),
			filter,
		});
		const res = await fetchWithRetry(`api/trace/logs?${query.toString()}`);
		if (!res.ok) throw new Error(`GET api/trace/logs failed: ${res.statusText}`);
		const data: unknown = await res.json();
		return validate(data, z.array(traceEntrySchema), 'api/trace/logs');
	},

	/**
	 * Get trace status.
	 *
	 * @returns Trace status.
	 */
	async getTraceStatus(): Promise<{enabled: boolean}> {
		const res = await fetchWithRetry('api/trace/status');
		if (!res.ok) throw new Error(`GET api/trace/status failed: ${res.statusText}`);
		return (await res.json()) as {enabled: boolean};
	},

	/**
	 * Toggle trace status.
	 *
	 * @param enabled - Enable or disable.
	 * @returns New status.
	 */
	async toggleTrace(enabled: boolean): Promise<{enabled: boolean}> {
		const res = await fetchWithRetry('api/trace/toggle', {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({enabled}),
		});
		if (!res.ok) throw new Error(`POST api/trace/toggle failed: ${res.statusText}`);
		return (await res.json()) as {enabled: boolean};
	},

	/**
	 * Clear trace logs.
	 */
	async clearTraces(): Promise<void> {
		const res = await fetchWithRetry('api/trace/clear', {method: 'POST'});
		if (!res.ok) throw new Error(`POST api/trace/clear failed: ${res.statusText}`);
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
