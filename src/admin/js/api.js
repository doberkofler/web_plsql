/**
 * @typedef {import('./types.js').CacheData} CacheData
 * @typedef {import('./types.js').PoolInfo} PoolInfo
 */

export const api = {
	/**
	 * @template T
	 * @param {string} path - The API path.
	 * @returns {Promise<T>} - The response data.
	 */
	async get(path) {
		const res = await fetch(path);
		if (!res.ok) throw new Error(`GET ${path} failed: ${res.statusText}`);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return /** @type {Promise<T>} */ (res.json());
	},
	/**
	 * @template T
	 * @param {string} path - The API path.
	 * @param {object} [body] - The request body.
	 * @returns {Promise<T>} - The response data.
	 */
	async post(path, body = {}) {
		const res = await fetch(path, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(body),
		});
		if (!res.ok) throw new Error(`POST ${path} failed: ${res.statusText}`);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return /** @type {Promise<T>} */ (res.json());
	},
};
