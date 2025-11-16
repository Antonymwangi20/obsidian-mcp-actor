import { describe, it, expect, vi } from 'vitest';
import { PersistentScrapeCache } from '../lib/cache/PersistentScrapeCache.js';

describe('PersistentScrapeCache', () => {
    it('should cache and retrieve values in memory and disk', async () => {
        const cache = new PersistentScrapeCache('test-cache');
        const url = 'https://example.com';
        const data = { foo: 'bar' };
        await cache.set(url, data);
        const result = await cache.get(url);
        expect(result).toEqual(data);
    });
});
