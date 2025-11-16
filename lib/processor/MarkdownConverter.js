/**
 * Converts HTML content to Markdown with YAML frontmatter
 * Handles: HTML→MD conversion, frontmatter generation, metadata embedding
 */

import TurndownService from 'turndown';

export class MarkdownConverter {
    constructor(options = {}) {
        this.turndownService = new TurndownService({
            headingStyle: options.headingStyle || 'atx',
            codeBlockStyle: options.codeBlockStyle || 'fenced',
            bulletListMarker: options.bulletListMarker || '-'
        });

        this.addMetadata = options.addMetadata !== false;
    }

    /**
     * Convert scraped data to Markdown with frontmatter
     * @param {Object} data - Scraped data object
     * @param {Array} tags - Optional tags to include
     * @returns {string} Markdown content
     */
    convert(data, tags = []) {
        let markdown = '';

        // Build YAML frontmatter
        if (this.addMetadata) {
            markdown += this._buildFrontmatter(data, tags);
        }

        // Add title
        markdown += `# ${data.title || 'Untitled'}\n\n`;

        // Add source link
        markdown += `> 🔗 Source: [${data.url}](${data.url})\n\n`;

        // Add scraped date
        const dateStr = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        markdown += `> 📅 Scraped: ${dateStr}\n\n`;

        markdown += '---\n\n';

        // Convert HTML to Markdown
        if (data.html || data.cleanText) {
            const content = data.html || '';
            const converted = this.turndownService.turndown(content);
            markdown += converted + '\n\n';
        }

        // Add images section if available
        if (data.images && data.images.length > 0) {
            markdown += this._buildImagesSection(data.images);
        }

        // Add metadata section if available
        if (data.metadata && Object.values(data.metadata).some(v => v)) {
            markdown += this._buildMetadataSection(data.metadata);
        }

        return markdown;
    }

    /**
     * Build YAML frontmatter
     * @private
     */
    _buildFrontmatter(data, tags) {
        let fm = '---\n';
        fm += `title: "${this._escapeYaml(data.title)}"\n`;
        fm += `url: ${data.url}\n`;
        fm += `scraped: ${new Date().toISOString()}\n`;

        if (tags.length > 0) {
            fm += `tags: [${tags.map(t => `"${this._escapeYaml(t)}"`).join(', ')}]\n`;
        }

        if (data.metadata?.description) {
            fm += `description: "${this._escapeYaml(data.metadata.description)}"\n`;
        }

        if (data.metadata?.author) {
            fm += `author: "${this._escapeYaml(data.metadata.author)}"\n`;
        }

        fm += '---\n\n';
        return fm;
    }

    /**
     * Build images section
     * @private
     */
    _buildImagesSection(images) {
        let section = '\n---\n\n## Images\n\n';
        for (const img of images) {
            const alt = img.alt || 'Image';
            section += `- ![${alt}](${img.src})\n`;
        }
        section += '\n';
        return section;
    }

    /**
     * Build metadata section
     * @private
     */
    _buildMetadataSection(metadata) {
        let section = '\n---\n\n## Metadata\n\n';
        
        if (metadata.author) {
            section += `- **Author:** ${metadata.author}\n`;
        }
        if (metadata.description) {
            section += `- **Description:** ${metadata.description}\n`;
        }
        if (metadata.canonical) {
            section += `- **Canonical:** ${metadata.canonical}\n`;
        }
        if (metadata.robots) {
            section += `- **Robots:** ${metadata.robots}\n`;
        }

        section += '\n';
        return section;
    }

    /**
     * Escape special YAML characters
     * @private
     */
    _escapeYaml(str) {
        if (!str) return '';
        return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    }
}
