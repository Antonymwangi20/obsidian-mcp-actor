/**
 * @fileoverview Centralized compatibility layer and utility exports
 * @module helpers
 * @deprecated This file is maintained for backward compatibility. 
 * New code should import from specific modules directly: 
 * import { UnifiedScraper } from './lib/processor/UnifiedScraper.js'
 */

// Modern service exports (recommended)
export { UnifiedScraper } from './processor/UnifiedScraper.js';
export { CheerioStrategy } from './scraper/CheerioStrategy.js';
export { PlaywrightStrategy } from './scraper/PlaywrightStrategy.js';
export { MemoryCache } from './cache/MemoryCache.js';
export { PersistentCache } from './cache/PersistentCache.js';
export { PersistentScrapeCache } from './cache/PersistentScrapeCache.js';
export { NoteManager } from './vault/NoteManager.js';
export { LinkManager } from './vault/LinkManager.js';
export { MarkdownConverter } from './processor/MarkdownConverter.js';
export { TagExtractor } from './processor/TagExtractor.js';
export { ResultsServer } from './server/ResultsServer.js';
export { ActorService, processUrls } from './processor/ActorService.js';

// Utility exports (backward compatibility)
export { getRandomUserAgent, USER_AGENTS } from './utils/ua.js';
export { ScrapeCache } from './utils/cache_legacy.js';
export { ScraperError } from './utils/errors.js';
export { validateUrl, sanitizeFileName } from './utils/url.js';
export { extractStructuredDataSafe, extractCleanText, extractImagesEnhanced, extractImagesFromHtml } from './utils/extractors.js';
export { extractEnhancedMetadata, validateContent, extractTags } from './utils/metadata.js';
export { retryWithBackoff } from './utils/retry.js';
export { loadTemplateConfig, loadVaultConfig, downloadImages, checkDuplicateNote } from './utils/files.js';
export { setupPlaywrightStealth, enhancedStealthMode, blockWebSockets } from './utils/stealth.js';

// Constants
export const MAX_CONTENT_SIZE = 10 * 1024 * 1024; // 10MB
export const DEFAULT_RATE_LIMIT_DELAY = 2000; // ms
export const DEFAULT_MAX_RETRIES = 3;

// Legacy function wrappers (deprecated but functional)
// These maintain backward compatibility for any external code that might import them

import { UnifiedScraper } from './processor/UnifiedScraper.js';
import { MemoryCache } from './cache/MemoryCache.js';

/**
 * @deprecated Use UnifiedScraper.scrape() instead
 */
export async function scrapeWebsite(url, retries = 3) {
  const scraper = new UnifiedScraper({ retries });
  return scraper.scrape(url);
}

/**
 * @deprecated Use UnifiedScraper with cache option instead
 */
export async function scrapeWebsiteWithFailover(url, usePlaywright = false, cache = null, retries = 3) {
  const scraper = new UnifiedScraper({ usePlaywright, cache, retries });
  return scraper.scrape(url);
}

/**
 * @deprecated Use UnifiedScraper({ usePlaywright: false }) instead
 */
export async function scrapeWebsiteCheerio(url, retries = 3) {
  const scraper = new UnifiedScraper({ usePlaywright: false, retries });
  return scraper.scrape(url);
}

/**
 * @deprecated Use UnifiedScraper({ usePlaywright: true }) instead
 */
export async function scrapeWebsitePlaywright(url, retries = 3) {
  const scraper = new UnifiedScraper({ usePlaywright: true, retries });
  return scraper.scrape(url);
}

/**
 * @deprecated Use UnifiedScraper with stealth options instead
 */
export async function scrapeWebsitePlaywrightEnhanced(url, retries = 3, timeout = 30000) {
  const scraper = new UnifiedScraper({ 
    usePlaywright: true, 
    retries, 
    timeout,
    enableStealth: true 
  });
  return scraper.scrape(url);
}

/**
 * @deprecated Use processUrls() from ActorService instead
 */
export async function scrapeMany(urlConfigs, options = {}) {
  const { ActorService } = await import('./processor/ActorService.js');
  const { vaultPath, folderPath, ...scrapeOptions } = options;
  return ActorService.processUrls({
    urls: urlConfigs,
    vaultPath,
    folderPath,
    ...scrapeOptions
  });
}