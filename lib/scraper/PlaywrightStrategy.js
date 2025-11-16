/**
 * Full browser automation for JavaScript-heavy sites
 * Best for: SPAs, PWAs, dynamic content, anti-bot protected sites
 * Used as: Fallback after CheerioStrategy fails
 */

import { chromium } from 'playwright';
import { getRandomUserAgent, ScraperError, validateUrl, extractImagesEnhanced, extractStructuredDataSafe, extractEnhancedMetadata, setupPlaywrightStealth, enhancedStealthMode, blockWebSockets } from '../helpers.js';

export class PlaywrightStrategy {
    constructor(options = {}) {
        this.timeout = options.timeout || 30000;
        this.maxRetries = options.maxRetries || 3;
        this.enableStealth = options.enableStealth !== false;
        this.blockWebSockets = options.blockWebSockets !== false;
        this.useCache = options.useCache !== false;
        this.cache = options.cache || null;
    }

    /**
     * Scrape a URL using Playwright
     * @param {string} url - Target URL
     * @returns {Promise<Object>} Scraped data
     */
    async scrape(url) {
        let browser = null;
        let context = null;

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

            console.log(`  → PlaywrightStrategy: Scraping ${validUrl}`);

            // Launch browser with stealth options
            browser = await chromium.launch({
                headless: true,
                args: ['--disable-blink-features=AutomationControlled']
            });

            // Create context with stealth settings
            context = await browser.newContext({
                userAgent: getRandomUserAgent(),
                viewport: { width: 1280, height: 720 },
                ignoreHTTPSErrors: true
            });

            // Apply stealth mode
            if (this.enableStealth) {
                await setupPlaywrightStealth(context);
                await enhancedStealthMode(context);
            }

            // Block WebSockets if enabled
            if (this.blockWebSockets) {
                await blockWebSockets(context);
            }

            const page = await context.newPage();
            const startTime = Date.now();

            try {
                // Navigate with timeout
                await page.goto(validUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: this.timeout
                });

                // Wait for network to settle (optional)
                await page.waitForLoadState('networkidle').catch(() => {});

                // Get page content
                const html = await page.content();
                const title = await page.title();

                // Extract metadata and media
                const metadata = await page.evaluate(() => {
                    const getMetaContent = (name) => {
                        const tag = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
                        return tag ? tag.getAttribute('content') : null;
                    };
                    return {
                        description: getMetaContent('description') || getMetaContent('og:description'),
                        author: getMetaContent('author'),
                        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
                        robots: getMetaContent('robots'),
                        ogImage: getMetaContent('og:image'),
                        twitterCard: getMetaContent('twitter:card')
                    };
                });

                const images = extractImagesEnhanced(html);
                const structuredData = extractStructuredDataSafe(html);

                const result = {
                    url: validUrl,
                    title: title || 'Untitled',
                    html,
                    cleanText: '',  // Playwright uses raw HTML; can be processed separately
                    metadata,
                    images,
                    structuredData,
                    statusCode: 200,
                    strategy: 'playwright',
                    _bytes: html.length,
                    _processingTime: Date.now() - startTime
                };

                // Cache the result
                if (this.cache) {
                    this.cache.set(validUrl, result);
                }

                return result;
            } catch (pageError) {
                throw new ScraperError(
                    `PlaywrightStrategy page error: ${pageError.message}`,
                    pageError.message.includes('timeout') ? 'timeout' : 'network',
                    validUrl
                );
            }
        } catch (err) {
            if (err instanceof ScraperError) {
                throw err;
            }
            throw new ScraperError(
                `PlaywrightStrategy failed: ${err.message}`,
                'network',
                url
            );
        } finally {
            // Cleanup
            if (context) await context.close().catch(() => {});
            if (browser) await browser.close().catch(() => {});
        }
    }
}
