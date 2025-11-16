// Legacy in-memory cache (kept for backwards compatibility)
export class ScrapeCache {
    constructor() {
        this.cache = new Map();
        this.hits = 0;
        this.misses = 0;
    }

    get(url) {
        if (this.cache.has(url)) {
            this.hits++;
            return this.cache.get(url);
        }
        this.misses++;
        return null;
    }

    set(url, data) {
        this.cache.set(url, data);
    }

    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }

    stats() {
        const total = this.hits + this.misses;
        return {
            hits: this.hits,
            misses: this.misses,
            total,
            hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(1) : '0'
        };
    }
}
