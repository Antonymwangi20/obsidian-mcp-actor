/**
 * @fileoverview robots.txt and rate limiting utilities for polite scraping
 * @module utils/robots
 */
import fetch from 'node-fetch';
import robotsParser from 'robots-txt-parser';

const parser = robotsParser();

/**
 * Checks if a URL is allowed by robots.txt
 * @param {string} url - The target URL
 * @returns {Promise<boolean>} True if allowed, false otherwise
 */
export async function isAllowedByRobots(url) {
    try {
        const robotsUrl = new URL('/robots.txt', url).href;
        const robotsTxt = await fetch(robotsUrl).then(r => r.text()).catch(() => '');
        parser.setUrl(robotsUrl);
        parser.read(robotsTxt);
        return parser.isAllowed(url, '*');
    } catch {
        return true; // Default to allowed if robots.txt cannot be fetched
    }
}

/**
 * Delays execution for a specified number of milliseconds
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}
