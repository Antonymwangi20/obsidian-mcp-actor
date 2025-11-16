#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { CheerioCrawler } from 'crawlee';
import TurndownService from 'turndown';
import {
    sanitizeFileName,
    validateContent,
    extractTags,
    loadTemplateConfig,
    loadVaultConfig,
    extractImagesFromHtml,
    downloadImages,
    checkDuplicateNote,
} from '../lib/helpers.js';
import { UnifiedScraper } from '../lib/processor/UnifiedScraper.js';

const COMMON_KEYWORDS = [
    'research', 'analysis', 'data', 'technology', 'science', 'business',
    'education', 'health', 'finance', 'marketing', 'design', 'development',
    'artificial intelligence', 'machine learning', 'cloud', 'security',
    'sustainability', 'innovation', 'strategy', 'management', 'culture'
];

const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-'
});

const server = new Server({
    name: 'obsidian-mcp-actor',
    version: '1.0.0',
});

// Tool: Scrape a website
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request;

    if (name === 'health_check') {
        return { content: [{ type: 'text', text: 'OK' }] };
    }
    if (name === 'scrape_website') {
        const { url, retries = 3 } = args;
        if (!url) throw new Error('url is required');
        try {
            const result = await scrapeWebsite(url, retries);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        title: result.title,
                        description: result.metadata.description,
                        author: result.metadata.author,
                        contentLength: result.text.length,
                        textPreview: result.text.substring(0, 200),
                    }, null, 2)
                }]
            };
        } catch (err) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({ success: false, error: err.message })
                }]
            };
        }
    }

    if (name === 'extract_tags') {
        const { title = '', description = '', text = '' } = args;
        try {
            const scrapedData = {
                title,
                url: args.url || 'https://example.com',
                metadata: { description },
                text
            };
            const tags = extractTags(scrapedData, COMMON_KEYWORDS);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({ success: true, tags }, null, 2)
                }]
            };
        } catch (err) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({ success: false, error: err.message })
                }]
            };
        }
    }

    if (name === 'validate_content') {
        const { title = '', html = '', text = '' } = args;
        try {
            const scrapedData = { title, html, text, url: args.url || 'https://example.com', metadata: {} };
            const validation = validateContent(scrapedData);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(validation, null, 2)
                }]
            };
        } catch (err) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({ valid: false, issues: [err.message] })
                }]
            };
        }
    }

    if (name === 'convert_html_to_markdown') {
        const { html = '' } = args;
        try {
            const markdown = turndownService.turndown(html);
            return {
                content: [{
                    type: 'text',
                    text: markdown
                }]
            };
        } catch (err) {
            return {
                content: [{
                    type: 'text',
                    text: `Error converting HTML: ${err.message}`
                }]
            };
        }
    }

    if (name === 'save_note') {
        const { vaultPath, folderPath = 'scraped', fileName, content } = args;
        if (!vaultPath || !fileName || !content) {
            throw new Error('vaultPath, fileName, and content are required');
        }
        try {
            const fullFolderPath = path.join(vaultPath, folderPath);
            await fs.mkdir(fullFolderPath, { recursive: true });
            const fullFilePath = path.join(fullFolderPath, `${fileName}.md`);
            await fs.writeFile(fullFilePath, content, 'utf8');
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        path: fullFilePath,
                        message: `Note saved successfully to ${fullFilePath}`
                    }, null, 2)
                }]
            };
        } catch (err) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({ success: false, error: err.message })
                }]
            };
        }
    }

    if (name === 'list_tools') {
        return {
            content: [{
                type: 'text',
                text: 'Available tools:\n' +
                    '1. scrape_website - Scrape a URL\n' +
                    '2. extract_tags - Extract tags from content\n' +
                    '3. validate_content - Validate scraped content quality\n' +
                    '4. convert_html_to_markdown - Convert HTML to Markdown\n' +
                    '5. save_note - Save note to Obsidian vault'
            }]
        };
    }

    throw new Error(`Unknown tool: ${name}`);
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'scrape_website',
                description: 'Scrape a website and extract title, metadata, and content',
                inputSchema: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', description: 'URL to scrape' },
                        retries: { type: 'number', description: 'Number of retry attempts (default 3)' }
                    },
                    required: ['url']
                }
            },
            {
                name: 'extract_tags',
                description: 'Extract tags from content using keyword analysis',
                inputSchema: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', description: 'Source URL' },
                        title: { type: 'string', description: 'Content title' },
                        description: { type: 'string', description: 'Content description' },
                        text: { type: 'string', description: 'Content text' }
                    }
                }
            },
            {
                name: 'validate_content',
                description: 'Validate scraped content quality',
                inputSchema: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', description: 'Source URL' },
                        title: { type: 'string', description: 'Content title' },
                        html: { type: 'string', description: 'Content HTML' },
                        text: { type: 'string', description: 'Content text' }
                    }
                }
            },
            {
                name: 'convert_html_to_markdown',
                description: 'Convert HTML content to Markdown format',
                inputSchema: {
                    type: 'object',
                    properties: {
                        html: { type: 'string', description: 'HTML content' }
                    },
                    required: ['html']
                }
            },
            {
                name: 'save_note',
                description: 'Save a note to Obsidian vault',
                inputSchema: {
                    type: 'object',
                    properties: {
                        vaultPath: { type: 'string', description: 'Absolute path to vault' },
                        folderPath: { type: 'string', description: 'Folder path within vault (default: scraped)' },
                        fileName: { type: 'string', description: 'Note file name without .md' },
                        content: { type: 'string', description: 'Markdown content' }
                    },
                    required: ['vaultPath', 'fileName', 'content']
                }
            }
        ]
    };
});

async function scrapeWebsite(url, retries = 3) {
    const scraper = new UnifiedScraper({ retries });
}

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Obsidian MCP Actor server running');
}

main().catch(console.error);
