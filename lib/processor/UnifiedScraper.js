/**
 * @fileoverview UnifiedScraper class for orchestrating Cheerio and Playwright scraping with caching and retry logic.
 * @module processor/UnifiedScraper
 */
import { scrapeWithCheerio } from './CheerioScrapeService.js';
import { scrapeWithPlaywright } from './PlaywrightScrapeService.js';
import { retryWithBackoff } from '../utils/RetryService.js';
import { validateUrl } from '../utils/url.js';
import { ScrapeCache } from '../utils/cache_legacy.js';
import { ScraperError } from '../utils/errors.js';
import { MAX_CONTENT_SIZE } from '../helpers.js';
import { isAllowedByRobots, delay } from '../utils/robots.js';

/**
 * UnifiedScraper orchestrates Cheerio and Playwright strategies with caching and retries.
 */
export class UnifiedScraper {
    /**
     * @param {object} options
     * @param {boolean} [options.usePlaywright=false]
     * @param {boolean} [options.enableStealth=true]
     * @param {number} [options.timeout=30000]
     * @param {boolean} [options.blockWebSockets=true]
     * @param {object} [options.cache]
     * @param {number} [options.retries=3]
     * @param {number} [options.baseDelay=1000]
     */
    constructor(options = {}) {
        this.usePlaywright = options.usePlaywright ?? false;
        this.enableStealth = options.enableStealth ?? true;
        this.timeout = options.timeout ?? 30000;
        this.blockWebSockets = options.blockWebSockets ?? true;
        this.cache = options.cache ?? new ScrapeCache();
        this.retries = options.retries ?? 3;
        this.baseDelay = options.baseDelay ?? 1000;
    }

    /**
     * Scrape a URL using Cheerio first, then Playwright fallback if enabled.
     * @param {string} url
     * @returns {Promise<object>} Scraped data
     */
    async scrape(url) {
        const normalizedUrl = validateUrl(url);
        // robots.txt check
        const allowed = await isAllowedByRobots(normalizedUrl);
        if (!allowed) {
            throw new ScraperError(`Blocked by robots.txt: ${normalizedUrl}`, 'robots', normalizedUrl);
        }
        // Rate limiting
        if (this.baseDelay > 0) {
            await delay(this.baseDelay);
        }
        // Check cache
        const cached = await this.cache.get(normalizedUrl);
        if (cached) {
            console.log(`  ✓ Cache hit for ${normalizedUrl}`);
            return cached;
        }
        // Try Cheerio first, then Playwright fallback if enabled
        try {
            const result = await retryWithBackoff(
                () => scrapeWithCheerio(normalizedUrl, this.retries),
                this.retries,
                this.baseDelay
            );
            await this.cache.set(normalizedUrl, result);
            return result;
        } catch (cheerioErr) {
            console.warn(`Cheerio failed: ${cheerioErr.message}`);
            if (!this.usePlaywright) throw cheerioErr;
            try {
                console.log(`  → Falling back to Playwright for ${normalizedUrl}`);
                const result = await retryWithBackoff(
                    () => scrapeWithPlaywright(normalizedUrl, this.retries),
                    this.retries,
                    this.baseDelay
                );
                await this.cache.set(normalizedUrl, result);
                return result;
            } catch (pwErr) {
                console.error(`Playwright also failed: ${pwErr.message}`);
                throw pwErr;
            }
        }
    }
}
