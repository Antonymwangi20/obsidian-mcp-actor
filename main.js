// main.js - Apify Actor Entry Point
import { Actor } from 'apify';
import { ApifyClient } from 'apify-client';
import TurndownService from 'turndown';
import fs from 'fs/promises';
import path from 'path';

// Initialize Turndown for HTML to Markdown conversion
const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-'
});

await Actor.main(async () => {
    // Get input from Apify Actor
    const input = await Actor.getInput();
    const {
        url,
        vaultPath,
        noteName,
        folderPath = 'scraped',
        addMetadata = true,
        tags = []
    } = input;

    console.log('Starting Obsidian MCP Actor...');
    console.log('URL:', url);
    console.log('Vault Path:', vaultPath);

    // Validate inputs
    if (!url || !vaultPath) {
        throw new Error('URL and vaultPath are required inputs');
    }

    // Ensure URL has protocol
    let validUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        validUrl = 'https://' + url;
        console.log('Added https:// protocol to URL:', validUrl);
    }

    try {
        // Step 1: Scrape the website using Apify's Website Content Crawler
        console.log('Step 1: Scraping website...');
        const scrapedData = await scrapeWebsite(validUrl);

        // Step 2: Convert HTML to Markdown
        console.log('Step 2: Converting to Markdown...');
        const markdown = convertToMarkdown(scrapedData, addMetadata, tags);

        // Step 3: Save to Obsidian vault
        console.log('Step 3: Saving to Obsidian vault...');
        const fileName = noteName || sanitizeFileName(scrapedData.title || 'untitled');
        await saveToVault(vaultPath, folderPath, fileName, markdown);

        console.log('✓ Successfully created note:', fileName);

        // Output result
        await Actor.pushData({
            success: true,
            notePath: path.join(folderPath, `${fileName}.md`),
            title: scrapedData.title,
            url: scrapedData.url,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error:', error.message);
        await Actor.pushData({
            success: false,
            error: error.message
        });
        throw error;
    }
});

/**
 * Scrape website using Apify's Website Content Crawler
 */
async function scrapeWebsite(url) {
    const client = new ApifyClient({
        token: process.env.APIFY_TOKEN
    });

    // Run Website Content Crawler Actor
    const run = await client.actor('apify/website-content-crawler').call({
        startUrls: [{ url }],
        maxCrawlPages: 1,
        crawlerType: 'cheerio'
    });

    // Fetch results
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    if (!items || items.length === 0) {
        throw new Error('No content scraped from URL');
    }

    return items[0];
}

/**
 * Convert scraped data to Markdown with front-matter
 */
function convertToMarkdown(data, addMetadata, tags) {
    let markdown = '';

    // Add YAML front-matter
    if (addMetadata) {
        markdown += '---\n';
        markdown += `title: "${data.title || 'Untitled'}"\n`;
        markdown += `url: ${data.url}\n`;
        markdown += `scraped: ${new Date().toISOString()}\n`;
        if (tags.length > 0) {
            markdown += `tags: [${tags.join(', ')}]\n`;
        }
        markdown += '---\n\n';
    }

    // Add title
    markdown += `# ${data.title || 'Untitled'}\n\n`;

    // Add source link
    markdown += `> Source: [${data.url}](${data.url})\n\n`;

    // Convert HTML content to Markdown
    if (data.text) {
        markdown += data.text + '\n\n';
    } else if (data.html) {
        const converted = turndownService.turndown(data.html);
        markdown += converted + '\n\n';
    }

    // Add metadata section
    if (data.metadata) {
        markdown += '## Metadata\n\n';
        markdown += `- **Author:** ${data.metadata.author || 'N/A'}\n`;
        markdown += `- **Description:** ${data.metadata.description || 'N/A'}\n`;
    }

    return markdown;
}

/**
 * Save markdown content to Obsidian vault
 */
async function saveToVault(vaultPath, folderPath, fileName, content) {
    const fullFolderPath = path.join(vaultPath, folderPath);
    const fullFilePath = path.join(fullFolderPath, `${fileName}.md`);

    // Create folder if it doesn't exist
    await fs.mkdir(fullFolderPath, { recursive: true });

    // Write the markdown file
    await fs.writeFile(fullFilePath, content, 'utf8');

    console.log('Note saved to:', fullFilePath);
}

/**
 * Sanitize filename for file system
 */
function sanitizeFileName(name) {
    return name
        .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .toLowerCase()
        .substring(0, 100); // Limit length
}