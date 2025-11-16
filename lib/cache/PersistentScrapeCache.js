import { KeyValueStore } from 'apify';

export class PersistentScrapeCache {
    constructor(storeName = 'scrape-cache') {
        this.storeName = storeName;
        this.memoryCache = new Map();
        this.maxMemorySize = 100;
        // lazy-open store
        this._storePromise = null;
    }

    async _store() {
        if (!this._storePromise) this._storePromise = KeyValueStore.open(this.storeName);
        return this._storePromise;
    }

    _sanitizeKey(url) {
        return Buffer.from(url).toString('base64url');
    }

    _addToMemory(url, data) {
        this.memoryCache.set(url, data);
        if (this.memoryCache.size > this.maxMemorySize) {
            const firstKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(firstKey);
        }
    }

    async get(url) {
        if (this.memoryCache.has(url)) return this.memoryCache.get(url);
        const store = await this._store();
        const key = this._sanitizeKey(url);
        const value = await store.getValue(key);
        if (value) {
            this._addToMemory(url, value);
            return value;
        }
        return null;
    }

    async set(url, data) {
        const store = await this._store();
        const key = this._sanitizeKey(url);
        await store.setValue(key, data, { contentType: 'application/json' });
        this._addToMemory(url, data);
    }

    stats() {
        return { size: this.memoryCache.size, maxSize: this.maxMemorySize };
    }
}
