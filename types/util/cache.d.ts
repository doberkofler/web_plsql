/**
 * @template T
 * @typedef {{hitCount: number, value: T}} cacheEntryType
 */
/**
 * Generic Cache class with LFU (Least Frequently Used) eviction policy.
 * @template T
 */
export class Cache<T> {
    /**
     * @param {number} maxSize - Maximum number of entries in the cache.
     */
    constructor(maxSize?: number);
    /** @type {Map<string, cacheEntryType<T>>} */
    cache: Map<string, cacheEntryType<T>>;
    maxSize: number;
    /**
     * Get an entry from the cache.
     * @param {string} key - The key.
     * @returns {T | undefined} - The value or undefined if not found.
     */
    get(key: string): T | undefined;
    /**
     * Set an entry in the cache.
     * @param {string} key - The key.
     * @param {T} value - The value.
     */
    set(key: string, value: T): void;
    /**
     * Delete an entry from the cache.
     * @param {string} key - The key.
     */
    delete(key: string): void;
    /**
     * Clear the cache.
     */
    clear(): void;
    /**
     * Prune the cache by removing the least frequently used entries.
     * Removes 10% of the cache size.
     */
    prune(): void;
    /**
     * Get the size of the cache.
     * @returns {number} - The size.
     */
    get size(): number;
}
export type cacheEntryType<T> = {
    hitCount: number;
    value: T;
};
