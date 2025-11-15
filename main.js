// main.js - Apify Actor Entry Point with Custom Scraper
import { Actor } from 'apify';
import { CheerioCrawler } from 'crawlee';
import TurndownService from 'turndown';
import cheerio from 'cheerio';
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

    // Load vault config (defaults) and template (overrides)
    const vaultConfig = actualInput.vaultPath ? await loadVaultConfig(actualInput.vaultPath) : {};
    let templateConfig = {};
    if (actualInput.templatePath && actualInput.vaultPath) {
        templateConfig = await loadTemplateConfig(actualInput.vaultPath, actualInput.templatePath);
        if (Object.keys(templateConfig).length > 0) console.log('✓ Loaded template configuration from', actualInput.templatePath);
    }

    // Merge configs: vault defaults < user input < template (template overrides input)
    actualInput = { ...vaultConfig, ...(actualInput || {}), ...templateConfig };

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
        bulkMode = false,
        updateExisting = false,
        templatePath = null,
        rateLimitDelay = 2000, // ms between requests in bulk mode
        downloadImages = false,
        imagesFolder = 'images'
    } = actualInput;

    // Performance metrics
    const metrics = {
        startTime: Date.now(),
        urlsProcessed: 0,
        bytesDownloaded: 0,
        averageProcessingTime: 0
    };

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
    
    for (let i = 0; i < urlsToProcess.length; i++) {
        const processUrl = urlsToProcess[i];
        console.log(`\n[${i + 1}/${urlsToProcess.length}] ━━ Processing: ${processUrl} ━━`);
        try {
            // Normalize URL
            let validUrl = processUrl;
            if (!processUrl.startsWith('http://') && !processUrl.startsWith('https://')) {
                validUrl = 'https://' + processUrl;
            }

            // Step 1: Scrape the website (with retry/backoff)
            console.log('Step 1: Scraping website...');
            const urlStartTime = Date.now();
            const scrapedData = await scrapeWebsite(validUrl, 3);

                    // Extract images (if any) and attach to scrapedData
            try {
                scrapedData._images = extractImagesFromHtml(scrapedData.html);
                if (downloadImages && scrapedData._images && scrapedData._images.length > 0) {
                    const saved = await downloadImages(scrapedData, vaultPath, folderPath, imagesFolder);
                    if (saved.length > 0) console.log(`  → Saved ${saved.length} images to ${path.join(folderPath, imagesFolder)}`);
                }
            } catch (e) {
                // non-fatal
            }

            // Update bytes downloaded metric (approximate)
            if (scrapedData && scrapedData._bytes) metrics.bytesDownloaded += scrapedData._bytes;

            // Validate scraped content before further processing
            const validation = validateContent(scrapedData);
            if (!validation.valid) {
                console.warn(`⚠️ Content quality issues for ${processUrl}: ${validation.issues.join(', ')}`);
                // continue processing but note issues in logs
            }
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
            let fileName = noteName || sanitizeFileName(scrapedData.title || 'untitled');

            // Duplicate detection
            const isDuplicate = await checkDuplicateNote(vaultPath, path.join(folderPath, fileName));
            if (isDuplicate && !updateExisting) {
                console.warn(`⚠️ Note already exists: ${fileName}.md -- appending timestamp to avoid overwrite`);
                fileName = `${fileName}-${Date.now()}`;
            }

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
            const timestamp = new Date().toISOString();
            results.push({
                success: true,
                url: processUrl,
                notePath: path.join(folderPath, `${fileName}.md`),
                title: scrapedData.title,
                tags: finalTags,
                timestamp
            });

            // Update performance metrics
            const processingTime = Date.now() - urlStartTime;
            metrics.averageProcessingTime = (metrics.averageProcessingTime * metrics.urlsProcessed + processingTime) / (metrics.urlsProcessed + 1);
            metrics.urlsProcessed += 1;

        } catch (urlError) {
            console.error(`✗ Error processing ${processUrl}:`, urlError.message);
            // Track failure but continue
            const timestamp = new Date().toISOString();
            results.push({
                success: false,
                url: processUrl,
                error: urlError.message,
                timestamp
            });

            // Update metrics for failed attempt
            try {
                const processingTime = Date.now() - urlStartTime;
                metrics.averageProcessingTime = (metrics.averageProcessingTime * metrics.urlsProcessed + processingTime) / (metrics.urlsProcessed + 1);
                metrics.urlsProcessed += 1;
            } catch (e) {
                // ignore if urlStartTime not defined
            }
        }

        // Rate limiting between requests in bulk mode
        if (bulkMode && i < urlsToProcess.length - 1 && rateLimitDelay > 0) {
            console.log(`⏳ Waiting ${rateLimitDelay/1000}s before next URL...`);
            await new Promise(res => setTimeout(res, rateLimitDelay));
        }
    }
    // Output batch results
    if (bulkMode && results.length > 1) {
        console.log(`\n━━ BULK IMPORT SUMMARY ━━`);
        console.log(`Total: ${results.length} URLs processed`);
        console.log(`Successful: ${results.filter(r => r.success).length}`);
        console.log(`Failed: ${results.filter(r => !r.success).length}`);
    }

    // Performance summary
    const totalTime = (Date.now() - metrics.startTime) / 1000;
    console.log('\n━━ PERFORMANCE METRICS ━━');
    console.log(`Total time: ${totalTime.toFixed(2)}s`);
    console.log(`Processed URLs: ${metrics.urlsProcessed}`);
    console.log(`Average per-URL: ${(metrics.averageProcessingTime / 1000).toFixed(2)}s`);
    console.log(`Bytes downloaded (approx): ${metrics.bytesDownloaded} bytes`);

    await Actor.pushData({
        success: results.every(r => r.success),
        processedCount: results.length,
        results: results
    });
});

import { sanitizeFileName, validateContent, extractTags, loadTemplateConfig, loadVaultConfig, extractImagesFromHtml, downloadImages, checkDuplicateNote } from './lib/helpers.js';

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
 * Scrape website using Crawlee's CheerioCrawler with retry/backoff
 */
async function scrapeWebsite(url, retries = 3) {
    const runOnce = () => new Promise((resolve, reject) => {
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
                let content = '';
                const contentSelectors = [
                    'article', 'main', '[role="main"]', '.content', '.post-content',
                    '.article-content', '#content', 'body'
                ];

                for (const selector of contentSelectors) {
                    const element = $(selector).first();
                    if (element.length > 0) {
                        element.find('script, style, nav, header, footer, .advertisement').remove();
                        content = element.html();
                        break;
                    }
                }

                if (!content) {
                    $('script, style, nav, header, footer').remove();
                    content = $('body').html() || body;
                }

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

    // Retry loop with exponential backoff
    let lastErr = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const result = await runOnce();
            // Track approximate bytes downloaded if available
            if (result && result.html) {
                result._bytes = Buffer.byteLength(result.html, 'utf8');
            }
            return result;
        } catch (err) {
            lastErr = err;
            console.warn(`Attempt ${attempt}/${retries} failed for ${url}: ${err.message}`);
            if (attempt < retries) {
                const wait = attempt * 1000;
                await new Promise(res => setTimeout(res, wait));
            }
        }
    }

    throw lastErr || new Error('Failed to scrape URL');
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

    // Optionally list extracted images at the end of the note
    if (data._images && data._images.length > 0) {
        markdown += '\n---\n\n';
        markdown += '## Images\n\n';
        for (const img of data._images) {
            markdown += `- ![${img.alt || ''}](${img.src})` + '\n';
        }
        markdown += '\n';
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
}
