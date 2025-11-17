/**
 * @fileoverview robots.txt and rate limiting utilities for polite scraping
 * @module utils/robots
 */

/**
 * Checks if a URL is allowed by robots.txt
 * @param {string} url - The target URL
 * @returns {Promise<boolean>} True if allowed, false otherwise
 */
export async function isAllowedByRobots(url) {
    try {
        const robotsUrl = new URL('/robots.txt', url).href;
        const response = await fetch(robotsUrl);
        if (!response.ok) return true; // If robots.txt doesn't exist, allow
        
        const robotsTxt = await response.text();
        
        // Simple parser: check if User-agent: * has Disallow rules for this path
        const urlPath = new URL(url).pathname;
        const lines = robotsTxt.split('\n');
        let inUserAgentSection = false;
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.toLowerCase().startsWith('user-agent:')) {
                inUserAgentSection = trimmed.toLowerCase().includes('*');
            }
            if (inUserAgentSection && trimmed.toLowerCase().startsWith('disallow:')) {
                const disallowPath = trimmed.substring(9).trim();
                if (disallowPath && urlPath.startsWith(disallowPath)) {
                    return false;
                }
            }
        }
        return true;
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