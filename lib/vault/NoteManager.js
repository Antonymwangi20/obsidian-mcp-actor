/**
 * Handles all Obsidian note file operations
 * Responsibilities: Create, update, delete notes; manage duplicates; handle frontmatter
 */

import fs from 'fs/promises';
import path from 'path';

export class NoteManager {
    constructor(vaultPath) {
        if (!vaultPath) {
            throw new Error('vaultPath is required for NoteManager');
        }
        this.vaultPath = vaultPath;
    }

    /**
     * Create a new note in the vault
     * @param {string} folderPath - Relative path within vault
     * @param {string} fileName - File name without .md extension
     * @param {string} content - Markdown content
     * @param {Object} options - Creation options
     * @returns {Promise<Object>} Created note info
     */
    async create(folderPath, fileName, content, options = {}) {
        const fullFolderPath = path.join(this.vaultPath, folderPath);
        const fullFilePath = path.join(fullFolderPath, `${fileName}.md`);

        // Create directory if needed
        await fs.mkdir(fullFolderPath, { recursive: true });

        // Check for duplicates if requested
        if (options.checkDuplicate !== false) {
            const exists = await this.exists(folderPath, fileName);
            if (exists && !options.overwrite) {
                const uniqueName = `${fileName}-${Date.now()}`;
                console.warn(`⚠️ Note already exists, using: ${uniqueName}`);
                return this.create(folderPath, uniqueName, content, { ...options, checkDuplicate: false });
            }
        }

        // Write the file
        await fs.writeFile(fullFilePath, content, 'utf8');

        return {
            fileName,
            folderPath,
            fullPath: fullFilePath,
            relativePath: path.join(folderPath, `${fileName}.md`)
        };
    }

    /**
     * Update an existing note
     * @param {string} folderPath - Relative path within vault
     * @param {string} fileName - File name without .md extension
     * @param {string|Function} contentOrFn - New content or function to transform
     * @returns {Promise<Object>} Updated note info
     */
    async update(folderPath, fileName, contentOrFn) {
        const fullFolderPath = path.join(this.vaultPath, folderPath);
        const fullFilePath = path.join(fullFolderPath, `${fileName}.md`);

        // Read existing content
        const existingContent = await fs.readFile(fullFilePath, 'utf-8');

        // Apply transformation if function provided
        const newContent = typeof contentOrFn === 'function' 
            ? contentOrFn(existingContent)
            : contentOrFn;

        // Write updated content
        await fs.writeFile(fullFilePath, newContent, 'utf-8');

        return {
            fileName,
            folderPath,
            fullPath: fullFilePath
        };
    }

    /**
     * Read note content
     * @param {string} folderPath - Relative path within vault
     * @param {string} fileName - File name without .md extension
     * @returns {Promise<string>} Note content
     */
    async read(folderPath, fileName) {
        const fullFilePath = path.join(this.vaultPath, folderPath, `${fileName}.md`);
        return fs.readFile(fullFilePath, 'utf-8');
    }

    /**
     * Check if note exists
     * @param {string} folderPath - Relative path within vault
     * @param {string} fileName - File name without .md extension
     * @returns {Promise<boolean>} True if exists
     */
    async exists(folderPath, fileName) {
        const fullFilePath = path.join(this.vaultPath, folderPath, `${fileName}.md`);
        try {
            await fs.stat(fullFilePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Delete a note
     * @param {string} folderPath - Relative path within vault
     * @param {string} fileName - File name without .md extension
     * @returns {Promise<void>}
     */
    async delete(folderPath, fileName) {
        const fullFilePath = path.join(this.vaultPath, folderPath, `${fileName}.md`);
        await fs.unlink(fullFilePath);
    }

    /**
     * List all notes in a folder
     * @param {string} folderPath - Relative path within vault
     * @returns {Promise<Array>} Array of note file names
     */
    async list(folderPath) {
        const fullFolderPath = path.join(this.vaultPath, folderPath);
        try {
            const files = await fs.readdir(fullFolderPath);
            return files.filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''));
        } catch {
            return [];
        }
    }

    /**
     * Sanitize file name for safe file system usage
     * @param {string} name - Raw name
     * @returns {string} Sanitized name
     */
    static sanitizeFileName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 100);
    }
}
