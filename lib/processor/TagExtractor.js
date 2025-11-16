/**
 * Intelligent tag extraction from content
 * Uses keywords, title analysis, and metadata extraction
 */

export class TagExtractor {
    constructor(options = {}) {
        this.keywords = options.keywords || this._getDefaultKeywords();
        this.maxTags = options.maxTags || 10;
        this.minConfidence = options.minConfidence || 0.3;
    }

    /**
     * Extract tags from scraped data
     * @param {Object} data - Scraped data object
     * @param {Array} userTags - Pre-defined tags to include
     * @returns {Array} Array of extracted tags
     */
    extract(data, userTags = []) {
        const tags = new Set(userTags);

        // Extract from title
        const titleTags = this._extractFromText(data.title || '');
        titleTags.forEach(t => tags.add(t));

        // Extract from description
        if (data.metadata?.description) {
            const descTags = this._extractFromText(data.metadata.description);
            descTags.forEach(t => tags.add(t));
        }

        // Extract from clean text
        if (data.cleanText) {
            const textTags = this._extractFromText(data.cleanText);
            textTags.forEach(t => tags.add(t));
        }

        // Extract from structured data
        if (data.structuredData && Array.isArray(data.structuredData)) {
            const structuredTags = this._extractFromStructuredData(data.structuredData);
            structuredTags.forEach(t => tags.add(t));
        }

        // Convert to array and limit
        const result = Array.from(tags)
            .filter(t => t && t.length > 0)
            .slice(0, this.maxTags);

        return result;
    }

    /**
     * Extract tags from plain text by keyword matching
     * @private
     */
    _extractFromText(text) {
        if (!text) return [];

        const lowerText = text.toLowerCase();
        const found = [];

        for (const keyword of this.keywords) {
            if (lowerText.includes(keyword.toLowerCase())) {
                found.push(keyword);
            }
        }

        return found;
    }

    /**
     * Extract tags from structured data (JSON-LD)
     * @private
     */
    _extractFromStructuredData(data) {
        const tags = [];

        for (const item of data) {
            // Extract from @type
            if (item['@type']) {
                const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
                tags.push(...types);
            }

            // Extract from keywords
            if (item.keywords) {
                const kw = typeof item.keywords === 'string' 
                    ? item.keywords.split(',').map(k => k.trim())
                    : Array.isArray(item.keywords) ? item.keywords : [];
                tags.push(...kw);
            }

            // Extract from categories
            if (item.articleSection) {
                tags.push(item.articleSection);
            }
        }

        return tags.filter(t => t && t.length > 0);
    }

    /**
     * Get default keywords for auto-tagging
     * @private
     */
    _getDefaultKeywords() {
        return [
            'research', 'analysis', 'data', 'technology', 'science', 'business',
            'education', 'health', 'finance', 'marketing', 'design', 'development',
            'artificial intelligence', 'machine learning', 'cloud', 'security',
            'sustainability', 'innovation', 'strategy', 'management', 'culture',
            'web development', 'mobile', 'fullstack', 'frontend', 'backend',
            'devops', 'database', 'api', 'rest', 'graphql', 'websocket',
            'authentication', 'authorization', 'encryption', 'privacy',
            'performance', 'optimization', 'monitoring', 'logging', 'testing',
            'agile', 'scrum', 'kanban', 'waterfall', 'continuous integration',
            'nodejs', 'python', 'javascript', 'typescript', 'java', 'golang',
            'react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt'
        ];
    }

    /**
     * Add custom keywords
     * @param {Array} keywords - Keywords to add
     */
    addKeywords(keywords) {
        this.keywords.push(...keywords);
        this.keywords = [...new Set(this.keywords)];
    }

    /**
     * Set keywords (replaces existing)
     * @param {Array} keywords - New keywords
     */
    setKeywords(keywords) {
        this.keywords = keywords;
    }

    /**
     * Get current keywords
     * @returns {Array} Current keywords
     */
    getKeywords() {
        return [...this.keywords];
    }
}
