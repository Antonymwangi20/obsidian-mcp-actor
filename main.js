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

// FEATURE 1: Intelligent tagging - Curated keywords for auto-tag extraction
const COMMON_KEYWORDS = [
    'research', 'analysis', 'data', 'technology', 'science', 'business',
    'education', 'health', 'finance', 'marketing', 'design', 'development',
    'artificial intelligence', 'machine learning', 'cloud', 'security',
    'sustainability', 'innovation', 'strategy', 'management', 'culture'
];

await Actor.main(async () => {
    // Get input from Apify Actor
    const input = await Actor.getInput();

    // If no input from Actor, try to load input.json for local testing
    let actualInput = input;
    if (!actualInput) {
        try {
            const inputData = await fs.readFile('./input.json', 'utf-8');
            actualInput = JSON.parse(inputData);
            console.log('✓ Loaded input from input.json');
        } catch (e) {
            // Ignore errors, will fail validation below
            actualInput = {};
        }
    }

    const {
        url,
        urls = [],
        vaultPath,
        noteName,
        folderPath = 'scraped',
        addMetadata = true,
        tags = [],
        autoTag = true,
        autoLink = true,
        bulkMode = false
    } = actualInput;

    console.log('Starting Obsidian MCP Actor...');
    
    // FEATURE 2: Bulk mode support
    let urlsToProcess = [];
    if (bulkMode && urls.length > 0) {
        console.log(`Bulk Mode: Processing ${urls.length} URLs`);
        urlsToProcess = urls;
    } else if (url) {
        console.log('Single Mode: Processing 1 URL');
        urlsToProcess = [url];
    }

    if (urlsToProcess.length === 0 || !vaultPath) {
        throw new Error('Either url or urls array is required, along with vaultPath');
    }

    // Process URLs with results tracking
    const results = [];
    
    for (const processUrl of urlsToProcess) {
        console.log(`\n━━ Processing: ${processUrl} ━━`);
        try {
            // Normalize URL
            let validUrl = processUrl;
            if (!processUrl.startsWith('http://') && !processUrl.startsWith('https://')) {
                validUrl = 'https://' + processUrl;
            }

            // Step 1: Scrape the website
            console.log('Step 1: Scraping website...');
            const scrapedData = await scrapeWebsite(validUrl);

            // FEATURE 1: Auto-tag generation
            let finalTags = [...tags];
            if (autoTag) {
                console.log('Step 1b: Analyzing content for intelligent tags...');
                const extractedTags = extractTags(scrapedData);
                finalTags = [...new Set([...tags, ...extractedTags])]; // Deduplicate
                console.log('✓ Auto-generated tags:', extractedTags.join(', '));
            }

            // Step 2: Convert HTML to Markdown
            console.log('Step 2: Converting to Markdown...');
            const markdown = convertToMarkdown(scrapedData, addMetadata, finalTags);

            // Step 3: Save to Obsidian vault
            console.log('Step 3: Saving to Obsidian vault...');
            const fileName = noteName || sanitizeFileName(scrapedData.title || 'untitled');
            await saveToVault(vaultPath, folderPath, fileName, markdown);

            // FEATURE 3: Auto internal linking
            if (autoLink) {
                console.log('Step 4: Adding internal links...');
                try {
                    await updateInternalLinks(vaultPath, fileName, finalTags);
                    console.log('✓ Internal linking completed');
                } catch (linkError) {
                    console.warn('⚠ Warning: Could not update internal links:', linkError.message);
                }
            }

            console.log('✓ Successfully created note:', fileName);

            // Track success
            results.push({
                success: true,
                url: processUrl,
                notePath: path.join(folderPath, `${fileName}.md`),
                title: scrapedData.title,
                tags: finalTags,
                timestamp: new Date().toISOString()
            });

        } catch (urlError) {
            console.error(`✗ Error processing ${processUrl}:`, urlError.message);
            // Track failure but continue
            results.push({
                success: false,
                url: processUrl,
                error: urlError.message
            });
        }
    }

    // Output batch results
    if (bulkMode && results.length > 1) {
        console.log(`\n━━ BULK IMPORT SUMMARY ━━`);
        console.log(`Total: ${results.length} URLs processed`);
        console.log(`Successful: ${results.filter(r => r.success).length}`);
        console.log(`Failed: ${results.filter(r => !r.success).length}`);
    }

    await Actor.pushData({
        success: results.every(r => r.success),
        processedCount: results.length,
        results: results
    });
});

/**
 * FEATURE 1: Extract intelligent tags from content
 */
function extractTags(scrapedData) {
    const text = (scrapedData.title + ' ' + scrapedData.metadata.description + ' ' + scrapedData.text).toLowerCase();
    const foundTags = [];

    for (const keyword of COMMON_KEYWORDS) {
        if (text.includes(keyword.toLowerCase())) {
            foundTags.push(keyword);
        }
    }

    // Also extract domain-based tag
    try {
        const url = new URL(scrapedData.url);
        const domain = url.hostname.replace('www.', '').split('.')[0];
        foundTags.push(domain);
    } catch (e) {
        // Ignore URL parsing errors
    }

    return [...new Set(foundTags)]; // Remove duplicates
}

/**
 * FEATURE 3: Update internal links in related notes
 */
async function updateInternalLinks(vaultPath, newNoteName, tags) {
    try {
        // Scan vault for existing notes
        const existingNotes = await scanVaultForNotes(vaultPath);
        
        let linkCount = 0;
        for (const note of existingNotes) {
            if (note.fileName === newNoteName) continue; // Skip self-references
            
            // Check for shared tags
            const sharedTags = tags.filter(t => note.tags && note.tags.includes(t));
            if (sharedTags.length > 0) {
                // Add bidirectional link
                const fullPath = path.join(vaultPath, note.path);
                let content = await fs.readFile(fullPath, 'utf-8');
                
                // Check if link doesn't already exist
                if (!content.includes(`[[${newNoteName}]]`)) {
                    const linkLine = `\n- Related: [[${newNoteName}]]`;
                    await fs.appendFile(fullPath, linkLine, 'utf-8');
                    linkCount++;
                }
            }
        }
        
        if (linkCount > 0) {
            console.log(`  → Added ${linkCount} cross-reference link(s)`);
        }
    } catch (error) {
        // Non-fatal error - vault might not exist yet
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
}

/**
 * FEATURE 3: Scan vault for notes and extract tags
 */
async function scanVaultForNotes(vaultPath) {
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
                    const content = await fs.readFile(fullPath, 'utf-8');
                    const tagsMatch = content.match(/tags:\s*\[(.*?)\]/);
                    const extractedTags = tagsMatch ? 
                        tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, '')) : [];
                    
                    notes.push({
                        fileName: item.replace('.md', ''),
                        path: relPath,
                        tags: extractedTags
                    });
                }
            }
        } catch (error) {
            // Ignore directory scan errors
        }
    };
    
    try {
        await scan(vaultPath);
    } catch (error) {
        // Vault doesn't exist yet, return empty
    }
    
    return notes;
}

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
    markdown += `> �� Scraped: ${new Date().toLocaleDateString('en-US', { 
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
