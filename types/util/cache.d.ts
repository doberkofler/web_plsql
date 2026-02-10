type cacheEntryType<T> = {
    hitCount: number;
    value: T;
};
/**
 * Generic Cache class with LFU (Least Frequently Used) eviction policy.
 */
export declare class Cache<T> {
    cache: Map<string, cacheEntryType<T>>;
    maxSize: number;
    hits: number;
    misses: number;
    /**
     * @param maxSize - Maximum number of entries in the cache.
     */
    constructor(maxSize?: number);
    /**
     * Get an entry from the cache.
     * @param key - The key.
     * @returns The value or undefined if not found.
     */
    get(key: string): T | undefined;
    /**
     * Set an entry in the cache.
     * @param key - The key.
     * @param value - The value.
     */
    set(key: string, value: T): void;
    /**
     * Delete an entry from the cache.
     * @param key - The key.
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
     * @returns The size.
     */
    get size(): number;
    /**
     * Get all keys in the cache.
     * @returns The keys.
     */
    keys(): string[];
    /**
     * Get cache statistics.
     * @returns The statistics.
     */
    getStats(): {
        size: number;
        maxSize: number;
        hits: number;
        misses: number;
    };
}
export {};
