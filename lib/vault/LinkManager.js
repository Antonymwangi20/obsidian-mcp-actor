/**
 * Handles Obsidian internal linking between notes
 * Responsibilities: Scan vault, find related notes, add cross-references
 */

import fs from 'fs/promises';
import path from 'path';

export class LinkManager {
    constructor(vaultPath) {
        if (!vaultPath) {
            throw new Error('vaultPath is required for LinkManager');
        }
        this.vaultPath = vaultPath;
    }

    /**
     * Scan vault and extract notes with their tags
     * @returns {Promise<Array>} Array of note objects with metadata
     */
    async scanNotes() {
        const notes = [];

        const scan = async (dir, relativePath = '') => {
            try {
                const items = await fs.readdir(dir);

                for (const item of items) {
                    const fullPath = path.join(dir, item);
                    const stats = await fs.stat(fullPath);
                    const relPath = path.join(relativePath, item);

                    if (stats.isDirectory() && !item.startsWith('.')) {
                        await scan(fullPath, relPath);
                    } else if (item.endsWith('.md')) {
                        try {
                            const content = await fs.readFile(fullPath, 'utf-8');
                            const fileName = item.replace('.md', '');
                            
                            // Extract tags from YAML frontmatter
                            const tagsMatch = content.match(/tags:\s*\[(.*?)\]/);
                            const tags = tagsMatch 
                                ? tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''))
                                : [];

                            // Extract links already in note
                            const links = Array.from(content.matchAll(/\[\[([^\]]+)\]\]/g)).map(m => m[1]);

                            notes.push({
                                fileName,
                                fullPath,
                                relativePath: relPath,
                                tags,
                                links,
                                content
                            });
                        } catch (e) {
                            // Skip files that can't be read
                        }
                    }
                }
            } catch (err) {
                // Ignore directory scan errors
            }
        };

        try {
            await scan(this.vaultPath);
        } catch (error) {
            console.warn(`Warning: Could not scan vault: ${error.message}`);
        }

        return notes;
    }

    /**
     * Find related notes based on shared tags
     * @param {string} fileName - Note file name (without .md)
     * @param {Array} tags - Tags to search for
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Array of related note objects
     */
    async findRelated(fileName, tags, options = {}) {
        const allNotes = await this.scanNotes();
        const maxResults = options.maxResults || 5;
        const minSharedTags = options.minSharedTags || 1;

        // Filter and score notes
        const related = allNotes
            .filter(note => note.fileName !== fileName)
            .map(note => {
                const sharedTags = tags.filter(t => note.tags.includes(t));
                return {
                    ...note,
                    sharedTagCount: sharedTags.length,
                    sharedTags
                };
            })
            .filter(note => note.sharedTagCount >= minSharedTags)
            .sort((a, b) => b.sharedTagCount - a.sharedTagCount)
            .slice(0, maxResults);

        return related;
    }

    /**
     * Add link to another note
     * @param {string} folderPath - Relative folder path
     * @param {string} fileName - File name without .md
     * @param {string} targetFileName - Target note name
     * @returns {Promise<boolean>} True if link was added
     */
    async addLink(folderPath, fileName, targetFileName) {
        const fullPath = path.join(this.vaultPath, folderPath, `${fileName}.md`);

        try {
            let content = await fs.readFile(fullPath, 'utf-8');

            // Check if link already exists
            if (content.includes(`[[${targetFileName}]]`)) {
                return false;  // Link already exists
            }

            // Append link before closing metadata or at end
            const linkLine = `- Related: [[${targetFileName}]]`;
            content = content.trim() + '\n\n' + linkLine;

            await fs.writeFile(fullPath, content, 'utf-8');
            return true;
        } catch (err) {
            console.warn(`Warning: Could not add link to ${fileName}: ${err.message}`);
            return false;
        }
    }

    /**
     * Create bidirectional links between notes
     * @param {string} folderPath - Relative folder path
     * @param {string} fileName - New note name
     * @param {Array} tags - Tags to match
     * @returns {Promise<number>} Number of links created
     */
    async createBidirectionalLinks(folderPath, fileName, tags) {
        const related = await this.findRelated(fileName, tags);
        let linkCount = 0;

        // Add links from related notes to new note
        for (const note of related) {
            const noteFolder = path.dirname(note.relativePath);
            const noteName = note.fileName;
            const added = await this.addLink(noteFolder, noteName, fileName);
            if (added) linkCount++;
        }

        // Add links from new note to related notes
        for (const note of related) {
            const added = await this.addLink(folderPath, fileName, note.fileName);
            if (added) linkCount++;
        }

        return linkCount;
    }

    /**
     * Remove a link from a note
     * @param {string} folderPath - Relative folder path
     * @param {string} fileName - File name without .md
     * @param {string} targetFileName - Target note name
     * @returns {Promise<boolean>} True if link was removed
     */
    async removeLink(folderPath, fileName, targetFileName) {
        const fullPath = path.join(this.vaultPath, folderPath, `${fileName}.md`);

        try {
            let content = await fs.readFile(fullPath, 'utf-8');
            const originalLength = content.length;

            // Remove all occurrences of the link
            content = content.replace(
                new RegExp(`- Related: \\[\\[${targetFileName}\\]\\]\\n?`, 'g'),
                ''
            );

            if (content.length !== originalLength) {
                await fs.writeFile(fullPath, content, 'utf-8');
                return true;
            }
            return false;
        } catch (err) {
            console.warn(`Warning: Could not remove link from ${fileName}: ${err.message}`);
            return false;
        }
    }
}
