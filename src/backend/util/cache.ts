import {DEFAULT_CACHE_MAX_SIZE, CACHE_PRUNE_PERCENT} from '../../common/constants.ts';

type cacheEntryType<T> = {
	hitCount: number;
	value: T;
};

/**
 * Generic Cache class with LFU (Least Frequently Used) eviction policy.
 */
export class Cache<T> {
	cache: Map<string, cacheEntryType<T>>;
	maxSize: number;
	hits: number;
	misses: number;

	/**
	 * @param maxSize - Maximum number of entries in the cache.
	 */
	constructor(maxSize: number = DEFAULT_CACHE_MAX_SIZE) {
		this.cache = new Map();
		this.maxSize = maxSize;
		this.hits = 0;
		this.misses = 0;
	}

	/**
	 * Get an entry from the cache.
	 * @param key - The key.
	 * @returns The value or undefined if not found.
	 */
	get(key: string): T | undefined {
		const entry = this.cache.get(key);
		if (entry) {
			entry.hitCount++;
			this.hits++;
			return entry.value;
		}
		this.misses++;
		return undefined;
	}

	/**
	 * Set an entry in the cache.
	 * @param key - The key.
	 * @param value - The value.
	 */
	set(key: string, value: T): void {
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
	 * @param key - The key.
	 */
	delete(key: string): void {
		this.cache.delete(key);
	}

	/**
	 * Clear the cache.
	 */
	clear(): void {
		this.cache.clear();
		this.hits = 0;
		this.misses = 0;
	}

	/**
	 * Prune the cache by removing the least frequently used entries.
	 * Removes 10% of the cache size.
	 */
	prune(): void {
		// Convert cache entries to an array
		const entries = Array.from(this.cache.entries());

		// Sort entries by hitCount in ascending order
		entries.sort((a, b) => a[1].hitCount - b[1].hitCount);

		// Remove the bottom 10%
		const removeCount = Math.max(1, Math.floor(this.maxSize * CACHE_PRUNE_PERCENT));
		const keysToRemove = entries.slice(0, removeCount).map(([key]) => key);

		for (const key of keysToRemove) {
			this.cache.delete(key);
		}
	}

	/**
	 * Get the size of the cache.
	 * @returns The size.
	 */
	get size(): number {
		return this.cache.size;
	}

	/**
	 * Get all keys in the cache.
	 * @returns The keys.
	 */
	keys(): string[] {
		return Array.from(this.cache.keys());
	}

	/**
	 * Get cache statistics.
	 * @returns The statistics.
	 */
	getStats(): {size: number; maxSize: number; hits: number; misses: number} {
		return {
			size: this.cache.size,
			maxSize: this.maxSize,
			hits: this.hits,
			misses: this.misses,
		};
	}
}
