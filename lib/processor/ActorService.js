/**
 * @fileoverview Service for orchestrating scraping and note creation
 * @module processor/ActorService
 */
import { UnifiedScraper } from './UnifiedScraper.js';
import { NoteManager } from '../vault/NoteManager.js';
import { LinkManager } from '../vault/LinkManager.js';
import { MarkdownConverter } from './MarkdownConverter.js';
import { TagExtractor } from './TagExtractor.js';
import { ResultsServer } from '../server/ResultsServer.js';

/**
 * Orchestrates scraping, markdown conversion, note creation, and linking.
 * @param {object} config - Actor configuration
 * @param {ResultsServer} resultsServer - Optional WebSocket server for real-time updates
 * @returns {Promise<object[]>} Array of result objects
 */
export async function processUrls(config, resultsServer = null) {
    const {
        urls,
        vaultPath,
        noteName,
        folderPath = 'scraped',
        addMetadata = true,
        tags = [],
        autoTag = true,
        autoLink = true,
        updateExisting = false,
        usePlaywright = false,
        rateLimitDelay = 2000,
        retries = 3
    } = config;

    const scraper = new UnifiedScraper({ usePlaywright, baseDelay: rateLimitDelay, retries });
    const noteManager = new NoteManager(vaultPath);
    const linkManager = new LinkManager(vaultPath);
    const markdownConverter = new MarkdownConverter({ addMetadata });
    const tagExtractor = new TagExtractor();

    const results = [];
    for (const targetUrl of urls) {
        try {
            const scrapedData = await scraper.scrape(targetUrl);
            let finalTags = [...tags];
            if (autoTag) {
                const extracted = tagExtractor.extract(scrapedData);
                finalTags = [...new Set([...tags, ...extracted])];
            }
            const markdown = markdownConverter.convert(scrapedData, finalTags);
            const fileName = noteManager.constructor.sanitizeFileName(noteName || scrapedData.title || 'untitled');
            const noteInfo = await noteManager.create(folderPath, fileName, markdown, {
                checkDuplicate: true,
                overwrite: updateExisting
            });
            if (autoLink) {
                await linkManager.createBidirectionalLinks(folderPath, noteInfo.fileName, finalTags);
            }
            const result = {
                success: true,
                url: targetUrl,
                notePath: noteInfo.relativePath,
                title: scrapedData.title,
                tags: finalTags,
                timestamp: new Date().toISOString()
            };
            results.push(result);
            if (resultsServer) resultsServer.broadcast(result);
        } catch (err) {
            const result = {
                success: false,
                url: targetUrl,
                error: err.message,
                timestamp: new Date().toISOString()
            };
            results.push(result);
            if (resultsServer) resultsServer.broadcast(result);
        }
    }
    return results;
}
