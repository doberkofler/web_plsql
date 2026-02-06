/**
 * @template T
 * @typedef {{hitCount: number, value: T}} cacheEntryType
 */

/**
 * Generic Cache class with LFU (Least Frequently Used) eviction policy.
 * @template T
 */
export class Cache {
	/**
	 * @param {number} maxSize - Maximum number of entries in the cache.
	 */
	constructor(maxSize = 10000) {
		/** @type {Map<string, cacheEntryType<T>>} */
		this.cache = new Map();
		this.maxSize = maxSize;
	}

	/**
	 * Get an entry from the cache.
	 * @param {string} key - The key.
	 * @returns {T | undefined} - The value or undefined if not found.
	 */
	get(key) {
		const entry = this.cache.get(key);
		if (entry) {
			entry.hitCount++;
			return entry.value;
		}
		return undefined;
	}

	/**
	 * Set an entry in the cache.
	 * @param {string} key - The key.
	 * @param {T} value - The value.
	 */
	set(key, value) {
		// If updating an existing key, preserve its hitCount?
		// Typically LFU implies resetting or keeping.
		// For simplicity and avoiding complex aging, if we set it again, we reset hitCount or keep it?
		// The requirement is "cache invalidation" (delete) or "cache loading" (set).
		// If we overwrite, it's usually a new value. Let's reset hitCount to 0 for a fresh start or 1.

		// Ensure we have space
		if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
			this.prune();
		}

		this.cache.set(key, {hitCount: 0, value});
	}

	/**
	 * Delete an entry from the cache.
	 * @param {string} key - The key.
	 */
	delete(key) {
		this.cache.delete(key);
	}

	/**
	 * Clear the cache.
	 */
	clear() {
		this.cache.clear();
	}

	/**
	 * Prune the cache by removing the least frequently used entries.
	 * Removes 10% of the cache size.
	 */
	prune() {
		// Convert cache entries to an array
		const entries = Array.from(this.cache.entries());

		// Sort entries by hitCount in ascending order
		entries.sort((a, b) => a[1].hitCount - b[1].hitCount);

		// Remove the bottom 10%
		const removeCount = Math.max(1, Math.floor(this.maxSize * 0.1));
		const keysToRemove = entries.slice(0, removeCount).map(([key]) => key);

		for (const key of keysToRemove) {
			this.cache.delete(key);
		}
	}

	/**
	 * Get the size of the cache.
	 * @returns {number} - The size.
	 */
	get size() {
		return this.cache.size;
	}
}
