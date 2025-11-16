/**
 * Fast, lightweight HTML scraping using Cheerio
 * Best for: static HTML, SEO pages, blogs, news
 * Fallback: None (goes to PlaywrightStrategy if JS rendering needed)
 */

import { CheerioCrawler, Dataset } from 'crawlee';
import { getRandomUserAgent, ScraperError, validateUrl, extractImagesEnhanced, extractStructuredDataSafe, extractEnhancedMetadata, extractCleanText } from '../helpers.js';

export class CheerioStrategy {
    constructor(options = {}) {
        this.timeout = options.timeout || 30000;
        this.maxRetries = options.maxRetries || 3;
        this.useCache = options.useCache !== false;
        this.cache = options.cache || null;
    }

    /**
     * Scrape a URL using CheerioCrawler
     * @param {string} url - Target URL
     * @returns {Promise<Object>} Scraped data
     */
    async scrape(url) {
        try {
            // Validate and normalize URL
            const validUrl = validateUrl(url);

            // Check cache first
            if (this.cache) {
                const cached = this.cache.get(validUrl);
                if (cached) {
                    console.log(`  → Cache hit for ${validUrl}`);
                    return cached;
                }
            }

            console.log(`  → CheerioStrategy: Scraping ${validUrl}`);

            // Create temporary dataset for Crawlee
            const dataset = await Dataset.open('temp-cheerio');

            let result = null;
            const startTime = Date.now();

            await new CheerioCrawler({
                maxRequestsPerCrawl: 1,
                useSessionPool: false,
                async requestHandler({ request, $, response }) {
                    try {
                        const html = response.body || $.html();
                        const title = $('title').text() || 'Untitled';
                        const metadata = extractEnhancedMetadata($, url);
                        const images = extractImagesEnhanced(html);
                        const cleanText = extractCleanText($);
                        const structuredData = extractStructuredDataSafe(html);

                        result = {
                            url: validUrl,
                            title: title.trim(),
                            html,
                            cleanText,
                            metadata,
                            images,
                            structuredData,
                            statusCode: response.statusCode,
                            strategy: 'cheerio',
                            _bytes: html.length,
                            _processingTime: Date.now() - startTime
                        };

                        // Cache the result
                        if (this.cache) {
                            this.cache.set(validUrl, result);
                        }
                    } catch (err) {
                        throw new ScraperError(
                            `CheerioStrategy handler error: ${err.message}`,
                            'processing',
                            validUrl
                        );
                    }
                },

                async errorHandler({ request, error }) {
                    const statusCode = error.response?.statusCode;
                    let category = 'network';
                    if (statusCode === 403 || statusCode === 429) {
                        category = 'blocked';
                    } else if (statusCode === 404) {
                        category = 'invalid';
                    }
                    throw new ScraperError(
                        `CheerioStrategy failed: ${error.message}`,
                        category,
                        validUrl
                    );
                }
            }).run([validUrl]);

            if (!result) {
                throw new ScraperError(
                    'CheerioStrategy returned no data',
                    'processing',
                    validUrl
                );
            }

            return result;
        } catch (err) {
            if (err instanceof ScraperError) {
                throw err;
            }
            throw new ScraperError(
                `CheerioStrategy failed: ${err.message}`,
                'network',
                url
            );
        }
    }
}
