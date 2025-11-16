/**
 * @fileoverview Retry utility for scraping operations
 * @module utils/RetryService
 */

/**
 * Retries a function with exponential backoff
 * @param {Function} fn - The async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in ms
 * @returns {Promise<*>} Result of the function or throws last error
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    // ...existing code from helpers.js retry loop...
}
