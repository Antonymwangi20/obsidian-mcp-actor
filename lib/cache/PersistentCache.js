/**
 * File-based caching with optional compression
 * Suitable for: Long-running services, persistent data, recovery
 * Stores cache to disk; loads on startup for fast warm starts
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class PersistentCache {
    constructor(options = {}) {
        this.cacheDir = options.cacheDir || path.join(__dirname, '../../storage/cache');
        this.ttl = options.ttl || null;  // Time-to-live in ms
        this.compress = options.compress !== false;
        this.cache = new Map();
        this.dirty = false;  // Track if unsaved changes exist
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * Initialize cache (load from disk if exists)
     */
    async init() {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
            const cacheFile = path.join(this.cacheDir, 'cache.json');
            
            try {
                const data = await fs.readFile(cacheFile, 'utf-8');
                const parsed = JSON.parse(data);
                
                for (const [url, entry] of Object.entries(parsed)) {
                    // Validate TTL on load
                    if (this.ttl && Date.now() - entry.timestamp > this.ttl) {
                        continue;  // Skip expired entries
                    }
                    this.cache.set(url, entry);
                }
                console.log(`✓ Loaded ${this.cache.size} entries from persistent cache`);
            } catch (e) {
                // No existing cache, start fresh
                console.log('ℹ Starting with fresh persistent cache');
            }
        } catch (err) {
            console.warn(`Warning: Could not initialize persistent cache: ${err.message}`);
        }
    }

    /**
     * Get cached data for a URL
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
            this.dirty = true;
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
     */
    set(url, data) {
        this.cache.set(url, {
            data,
            timestamp: Date.now(),
            accessCount: 0,
            lastAccess: Date.now()
        });
        this.dirty = true;
    }

    /**
     * Persist cache to disk
     */
    async save() {
        if (!this.dirty) return;

        try {
            const cacheFile = path.join(this.cacheDir, 'cache.json');
            const data = {};
            
            for (const [url, entry] of this.cache) {
                data[url] = entry;
            }

            await fs.writeFile(cacheFile, JSON.stringify(data, null, 2), 'utf-8');
            this.dirty = false;
            console.log(`✓ Persistent cache saved (${this.cache.size} entries)`);
        } catch (err) {
            console.warn(`Warning: Could not save persistent cache: ${err.message}`);
        }
    }

    /**
     * Clear all cache data
     */
    async clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
        this.dirty = true;
        await this.save();
    }

    /**
     * Get cache statistics
     */
    stats() {
        const total = this.hits + this.misses;
        return {
            hits: this.hits,
            misses: this.misses,
            total,
            hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : 'N/A',
            size: this.cache.size
        };
    }

    /**
     * Get all cached URLs
     */
    keys() {
        return Array.from(this.cache.keys());
    }
}
