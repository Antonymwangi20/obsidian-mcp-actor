/**
 * In-memory URL caching with statistics
 * Suitable for: Single runs, bulk processing, temporary sessions
 */

export class MemoryCache {
    constructor(options = {}) {
        this.cache = new Map();
        this.maxSize = options.maxSize || 1000;  // Max URLs to cache
        this.ttl = options.ttl || null;  // Time-to-live in ms (null = infinite)
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * Get cached data for a URL
     * @param {string} url - Cache key
     * @returns {Object|null} Cached data or null
     */
    get(url) {
        if (!this.cache.has(url)) {
            this.misses++;
            return null;
        }

        const entry = this.cache.get(url);
        
        // Check TTL
        if (this.ttl && Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(url);
            this.misses++;
            return null;
        }

        this.hits++;
        entry.accessCount++;
        entry.lastAccess = Date.now();
        return entry.data;
    }

    /**
     * Set cache data for a URL
     * @param {string} url - Cache key
     * @param {Object} data - Data to cache
     */
    set(url, data) {
        // Evict oldest entry if cache is full
        if (this.cache.size >= this.maxSize && !this.cache.has(url)) {
            let oldest = null;
            let oldestTime = Infinity;
            for (const [key, entry] of this.cache) {
                if (entry.lastAccess < oldestTime) {
                    oldestTime = entry.lastAccess;
                    oldest = key;
                }
            }
            if (oldest) this.cache.delete(oldest);
        }

        this.cache.set(url, {
            data,
            timestamp: Date.now(),
            accessCount: 0,
            lastAccess: Date.now()
        });
    }

    /**
     * Clear all cache data
     */
    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * Get cache statistics
     * @returns {Object} Stats object
     */
    stats() {
        const total = this.hits + this.misses;
        return {
            hits: this.hits,
            misses: this.misses,
            total,
            hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : 'N/A',
            size: this.cache.size,
            maxSize: this.maxSize
        };
    }

    /**
     * Get all cached URLs
     * @returns {string[]} Array of cached URLs
     */
    keys() {
        return Array.from(this.cache.keys());
    }
}
