// main.js - Apify Actor Entry Point with Custom Scraper
import { Actor } from 'apify';
import { CheerioCrawler } from 'crawlee';
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
        // Step 1: Scrape the website using custom Cheerio crawler
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
 * Scrape website using Crawlee's CheerioCrawler (lightweight, free)
 */
async function scrapeWebsite(url) {
    return new Promise((resolve, reject) => {
        let scrapedData = null;

        const crawler = new CheerioCrawler({
            maxRequestsPerCrawl: 1,
            requestHandler: async ({ request, $, body }) => {
                console.log(`Scraping: ${request.url}`);

                // Extract title
                const title = $('title').text() || 
                             $('h1').first().text() || 
                             $('meta[property="og:title"]').attr('content') ||
                             'Untitled';

                // Extract meta description
                const description = $('meta[name="description"]').attr('content') ||
                                  $('meta[property="og:description"]').attr('content') ||
                                  '';

                // Extract author
                const author = $('meta[name="author"]').attr('content') ||
                             $('meta[property="article:author"]').attr('content') ||
                             '';

                // Extract main content
                // Try common content containers
                let content = '';
                const contentSelectors = [
                    'article',
                    'main',
                    '[role="main"]',
                    '.content',
                    '.post-content',
                    '.article-content',
                    '#content',
                    'body'
                ];

                for (const selector of contentSelectors) {
                    const element = $(selector).first();
                    if (element.length > 0) {
                        // Remove script, style, nav, header, footer
                        element.find('script, style, nav, header, footer, .advertisement').remove();
                        content = element.html();
                        break;
                    }
                }

                // If still no content, get the whole body
                if (!content) {
                    $('script, style, nav, header, footer').remove();
                    content = $('body').html() || body;
                }

                // Extract text for preview
                const text = $.text().trim().substring(0, 500);

                scrapedData = {
                    url: request.url,
                    title: title.trim(),
                    html: content,
                    text: text,
                    metadata: {
                        description: description.trim(),
                        author: author.trim()
                    }
                };
            },
            failedRequestHandler: async ({ request }) => {
                console.error(`Request ${request.url} failed`);
                reject(new Error(`Failed to scrape ${request.url}`));
            }
        });

        crawler.run([url])
            .then(() => {
                if (scrapedData) {
                    resolve(scrapedData);
                } else {
                    reject(new Error('No data scraped from URL'));
                }
            })
            .catch(reject);
    });
}

/**
 * Convert scraped data to Markdown with front-matter
 */
function convertToMarkdown(data, addMetadata, tags) {
    let markdown = '';

    // Add YAML front-matter
    if (addMetadata) {
        markdown += '---\n';
        markdown += `title: "${data.title.replace(/"/g, '\\"')}"\n`;
        markdown += `url: ${data.url}\n`;
        markdown += `scraped: ${new Date().toISOString()}\n`;
        if (tags.length > 0) {
            markdown += `tags: [${tags.join(', ')}]\n`;
        }
        if (data.metadata.description) {
            markdown += `description: "${data.metadata.description.replace(/"/g, '\\"')}"\n`;
        }
        if (data.metadata.author) {
            markdown += `author: "${data.metadata.author.replace(/"/g, '\\"')}"\n`;
        }
        markdown += '---\n\n';
    }

    // Add title
    markdown += `# ${data.title}\n\n`;

    // Add source link
    markdown += `> 🔗 Source: [${data.url}](${data.url})\n\n`;

    // Add scraped date
    markdown += `> 📅 Scraped: ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    })}\n\n`;

    markdown += '---\n\n';

    // Convert HTML content to Markdown
    if (data.html) {
        const converted = turndownService.turndown(data.html);
        markdown += converted + '\n\n';
    }

    // Add metadata section at the bottom
    if (data.metadata.description || data.metadata.author) {
        markdown += '\n---\n\n';
        markdown += '## Metadata\n\n';
        if (data.metadata.author) {
            markdown += `- **Author:** ${data.metadata.author}\n`;
        }
        if (data.metadata.description) {
            markdown += `- **Description:** ${data.metadata.description}\n`;
        }
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