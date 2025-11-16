import { ScraperError } from './errors.js';
import path from 'path';

export function validateUrl(url) {
    if (!url || typeof url !== 'string') {
        throw new ScraperError('URL must be a non-empty string', 'invalid', url);
    }
    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = 'https://' + normalized;
    }
    try {
        new URL(normalized);
        return normalized;
    } catch (e) {
        throw new ScraperError(`Invalid URL format: ${url}`, 'invalid', url);
    }
}

export function sanitizeFileName(name) {
    if (!name || typeof name !== 'string') return 'untitled';

    // Remove nulls/newlines and other dangerous characters
    let sanitized = name
        .replace(/[\0\r\n<>:\"|?*]/g, '')
        .replace(/[\/]+/g, '-') // replace any slashes/backslashes with dash
        .replace(/\s+/g, '-')
        .toLowerCase()
        .trim()
        .substring(0, 100);

    // Prevent path traversal and absolute paths
    if (sanitized.includes('..') || path.isAbsolute(sanitized)) {
        throw new ScraperError(`Invalid file name (possible path traversal): ${name}`, 'security', name);
    }

    return sanitized || 'untitled';
}
