/**
 * @fileoverview Service for Cheerio-based scraping
 * @module processor/CheerioScrapeService
 */
import { CheerioCrawler } from 'crawlee';
import { getRandomUserAgent, ScraperError } from '../utils/ua.js';
import { extractStructuredDataSafe, extractCleanText, extractImagesEnhanced } from '../utils/extractors.js';
import { extractEnhancedMetadata } from '../utils/metadata.js';
import { MAX_CONTENT_SIZE } from '../helpers.js';

/**
 * Scrapes a static HTML page using CheerioCrawler
 * @param {string} url - The URL to scrape
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<Object>} Scraped data object
 */
export async function scrapeWithCheerio(url, retries = 3) {
    // ...existing code from helpers.js scrapeWebsite...
}
