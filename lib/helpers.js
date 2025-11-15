import fs from 'fs/promises';
import path from 'path';
import cheerio from 'cheerio';
import { chromium } from 'playwright';
import { CheerioCrawler } from 'crawlee';

// --- OPTIMIZATION: User Agent Rotation ---
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
];

export function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// --- OPTIMIZATION: URL-based caching ---
export class ScrapeCache {
    constructor() {
        this.cache = new Map();
        this.hits = 0;
        this.misses = 0;
    }

    get(url) {
        if (this.cache.has(url)) {
            this.hits++;
            return this.cache.get(url);
        }
        this.misses++;
        return null;
    }

    set(url, data) {
        this.cache.set(url, data);
    }

    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }

    stats() {
        const total = this.hits + this.misses;
        return {
            hits: this.hits,
            misses: this.misses,
            total,
            hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(1) : '0'
        };
    }
}

export function sanitizeFileName(name) {
    return name
        .replace(/[<>:\"/\\|?*]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase()
        .substring(0, 100);
}

export function validateContent(scrapedData) {
    const issues = [];
    if (!scrapedData) {
        issues.push('No scraped data');
        return { valid: false, issues };
    }

    const title = (scrapedData.title || '').trim();
    if (!title || title.toLowerCase() === 'untitled') {
        issues.push('Missing meaningful title');
    }

    const html = scrapedData.html || '';
    const text = (scrapedData.text || '').trim();
    if ((html.length + text.length) < 100) {
        issues.push('Content too short (less than 100 characters)');
    }

    const blocked = ['Access Denied', '403 Forbidden', "You don't have permission", 'Not Found'];
    for (const token of blocked) {
        if (html.includes(token) || text.includes(token)) {
            issues.push('Possible access restriction detected');
            break;
        }
    }

    return { valid: issues.length === 0, issues };
}

export function extractTags(scrapedData, commonKeywords = []) {
    const text = ((scrapedData.title || '') + ' ' + (scrapedData.metadata?.description || '') + ' ' + (scrapedData.text || '')).toLowerCase();
    const tagScores = {};
    for (const keyword of commonKeywords) {
        const safe = keyword.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\b${safe}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches && matches.length > 0) tagScores[keyword] = matches.length;
    }

    const sortedTags = Object.entries(tagScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag]) => tag);

    const foundTags = [...sortedTags];
    try {
        const urlObj = new URL(scrapedData.url);
        const domain = urlObj.hostname.replace('www.', '').split('.')[0];
        if (domain) foundTags.push(domain);
    } catch (e) {
        // ignore
    }

    return [...new Set(foundTags)];
}

export async function loadTemplateConfig(vaultPath, templatePath) {
    try {
        const fullPath = path.join(vaultPath, `${templatePath}.md`);
        const content = await fs.readFile(fullPath, 'utf-8');
        const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontMatterMatch) return {};
        const yaml = frontMatterMatch[1];
        const config = {};
        for (const line of yaml.split('\n')) {
            const idx = line.indexOf(':');
            if (idx === -1) continue;
            const key = line.slice(0, idx).trim();
            let value = line.slice(idx + 1).trim();
            value = value.replace(/^['\"]|['\"]$/g, '');
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
            else if (!isNaN(Number(value))) value = Number(value);
            config[key] = value;
        }
        return config;
    } catch (err) {
        return {};
    }
}

export async function loadVaultConfig(vaultPath) {
    try {
        const configPath = path.join(vaultPath, '.obsidian-mcp-config.json');
        const raw = await fs.readFile(configPath, 'utf-8');
        return JSON.parse(raw);
    } catch (e) {
        return {};
    }
}

export function extractImagesFromHtml(html) {
    if (!html) return [];
    const $ = cheerio.load(html);
    const images = [];
    $('img').each((i, el) => {
        const src = $(el).attr('src');
        const alt = $(el).attr('alt') || '';
        if (src) images.push({ src, alt });
    });
    return images;
}

export async function downloadImages(scrapedData, vaultPath, folderPath = 'scraped', imagesFolder = 'images') {
    if (!scrapedData || !scrapedData._images || scrapedData._images.length === 0) return [];
    const saved = [];
    const baseDir = path.join(vaultPath, folderPath, imagesFolder);
    await fs.mkdir(baseDir, { recursive: true });
    for (const img of scrapedData._images) {
        try {
            // Resolve absolute URL if relative
            let src = img.src;
            if (src.startsWith('//')) src = 'https:' + src;
            // If relative, attempt to resolve using scrapedData.url
            if (!src.startsWith('http')) {
                try {
                    const u = new URL(src, scrapedData.url);
                    src = u.href;
                } catch (e) {
                    // skip non-resolvable
                    continue;
                }
            }
            const res = await fetch(src);
            if (!res.ok) continue;
            const buffer = Buffer.from(await res.arrayBuffer());
            const ext = path.extname(new URL(src).pathname) || '.jpg';
            const fileName = `${sanitizeFileName(path.basename(new URL(src).pathname) || 'img') || 'image'}-${Date.now()}${ext}`;
            const outPath = path.join(baseDir, fileName);
            await fs.writeFile(outPath, buffer);
            saved.push({ src: src, local: path.join(folderPath, imagesFolder, fileName) });
        } catch (e) {
            // skip failures
            continue;
        }
    }
    return saved;
}

export async function checkDuplicateNote(vaultPath, fileName) {
    try {
        const fullPath = path.join(vaultPath, `${fileName}.md`);
        await fs.access(fullPath);
        return true; // exists
    } catch (e) {
        return false; // does not exist
    }
}

// --- OPTIMIZATION: Cheerio-based Scraper with rotating user agents ---
export async function scrapeWebsite(url, retries = 3) {
    // Validate and normalize URL
    let normalizedUrl = url;
    try {
        new URL(normalizedUrl);
    } catch (e) {
        throw new Error(`Invalid URL format: ${url} - ${e.message}`);
    }

    const runOnce = () => new Promise((resolve, reject) => {
        let scrapedData = null;
        let requestWasProcessed = false;

        const crawler = new CheerioCrawler({
            maxRequestsPerCrawl: 1,
            maxRequestRetries: 1,
            maxRequestsPerMinute: 60,
            navigationTimeoutSecs: 30,
            requestHandlerTimeoutSecs: 60,
            requestHandler: async ({ request, $, body }) => {
                console.log(`Scraping: ${request.url}`);
                requestWasProcessed = true;

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
                    html: content || body,
                    text: text,
                    metadata: {
                        description: description.trim(),
                        author: author.trim()
                    }
                };
            },
            failedRequestHandler: async ({ request }) => {
                console.error(`✗ Request handler failed for ${request.url}`);
            }
        });

        // Add custom headers with rotating user agents
        const requestList = [];
        requestList.push({
            url: normalizedUrl,
            headers: {
                'User-Agent': getRandomUserAgent(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        crawler.run(requestList)
            .then(() => {
                if (!requestWasProcessed) {
                    reject(new Error(`Crawler did not process the request - URL may be blocked, invalid, or require JavaScript rendering`));
                } else if (scrapedData) {
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
            const errorDetails = err.message || 'Unknown error';
            console.warn(`Attempt ${attempt}/${retries} failed for ${url}: ${errorDetails}`);
            
            if (attempt === retries) {
                console.error(`⚠️ Final failure for ${url}:`);
                console.error(`   This URL may require JavaScript rendering, be behind a login, or be blocked.`);
            }
            if (attempt < retries) {
                const wait = attempt * 1000;
                await new Promise(res => setTimeout(res, wait));
            }
        }
    }

    throw lastErr || new Error('Failed to scrape URL after all retries');
}

// --- Hardened Playwright Scraper ---
// Fixes strict mode issues, missing meta tags, multi-title chaos, and brittle selectors

export async function scrapeWebsitePlaywright(url, retries = 3) {
    let normalizedUrl = url;
    try {
        new URL(normalizedUrl);
    } catch (e) {
        throw new Error(`Invalid URL format: ${url} - ${e.message}`);
    }

    let browser = null;
    let lastErr = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            browser = await chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            const context = await browser.newContext({
                userAgent:
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
            });

            const page = await context.newPage();
            
            await page.goto(normalizedUrl, { 
                waitUntil: 'networkidle',
                timeout: 30000 
            });

            await page.waitForLoadState('networkidle');

            // --- FIX 1: Multi-title issue ---
            const title =
                await page.locator('head > title', { strict: false })
                    .first()
                    .textContent()
                    .catch(() => null)
                ||
                await page.locator('h1', { strict: false })
                    .first()
                    .textContent()
                    .catch(() => null)
                ||
                await page.locator('meta[property="og:title"]')
                    .getAttribute('content')
                    .catch(() => null)
                ||
                'Untitled';

            // --- FIX 2: Safe meta description extraction ---
            const description =
                await page.locator('meta[name="description"]')
                    .getAttribute('content')
                    .catch(() => null)
                || '';

            const author =
                await page.locator('meta[name="author"]').getAttribute('content').catch(() => null)
                ||
                await page.locator('meta[property="article:author"]').getAttribute('content').catch(() => null)
                || '';

            // --- Extract main content safely ---
            let content = '';
            const selectors = [
                'article', 'main', '[role="main"]', '.content', '.post-content',
                '.article-content', '#content', 'body'
            ];

            for (const selector of selectors) {
                const elem = page.locator(selector).first();
                if ((await elem.count()) > 0) {
                    await page.evaluate(sel => {
                        const e = document.querySelector(sel);
                        if (!e) return;
                        e.querySelectorAll('script,style,nav,header,footer,.advertisement')
                            .forEach(n => n.remove());
                    }, selector);
                    content = await elem.innerHTML();
                    break;
                }
            }

            if (!content) {
                content = await page.evaluate(() => {
                    document.querySelectorAll('script,style,nav,header,footer')
                        .forEach(e => e.remove());
                    return document.body.innerHTML || '';
                });
            }

            const text = (
                await page.textContent('body').catch(() => '')
            ).trim().slice(0, 500);

            await page.close();
            await context.close();
            await browser.close();

            return {
                url: normalizedUrl,
                title: (title || '').trim(),
                html: content,
                text: text,
                metadata: {
                    description: (description || '').trim(),
                    author: (author || '').trim()
                },
                _isPlaywright: true
            };

        } catch (err) {
            lastErr = err;

            console.warn(`Attempt ${attempt}/${retries} failed (Playwright) for ${url}: ${err.message}`);

            if (attempt === retries) {
                console.error(`Final failure for ${url}: ${err.message}`);
            }

            if (browser) {
                try { await browser.close(); } catch {}
            }

            if (attempt < retries) {
                await new Promise(res => setTimeout(res, attempt * 1000));
            }
        }
    }

    throw lastErr || new Error('Failed to scrape URL with Playwright');
}

// --- OPTIMIZATION: Dual-mode with failover (Playwright → Cheerio fallback) ---
export async function scrapeWebsiteWithFailover(url, usePlaywright = false, cache = null, retries = 3) {
    // Check cache first
    if (cache) {
        const cached = cache.get(url);
        if (cached) {
            console.log(`  ✓ Cache hit for ${url}`);
            return cached;
        }
    }

    if (usePlaywright) {
        try {
            const result = await scrapeWebsitePlaywright(url, retries);
            if (cache) cache.set(url, result);
            return result;
        } catch (err) {
            console.warn(`  ⚠ Playwright failed, falling back to Cheerio: ${err.message}`);
            // Fall through to Cheerio
        }
    }

    const result = await scrapeWebsiteCheerio(url, retries);
    if (cache) cache.set(url, result);
    return result;
}

// Export Cheerio scraper for failover (wrapper of original scrapeWebsite)
export async function scrapeWebsiteCheerio(url, retries = 3) {
    return scrapeWebsite(url, retries);
}

// --- OPTIMIZATION: Concurrent URL scraping ---
export async function scrapeMany(urlConfigs, options = {}) {
    const {
        concurrency = 5,
        usePlaywright = false,
        useCache = true,
        onProgress = null,
        retries = 3
    } = options;

    const cache = useCache ? new ScrapeCache() : null;
    const results = [];
    const queue = [...urlConfigs];
    const workers = [];

    // Create worker tasks
    const worker = async (workerId) => {
        while (queue.length > 0) {
            const config = queue.shift();
            if (!config) break;

            try {
                const url = typeof config === 'string' ? config : config.url;
                const startTime = Date.now();

                const data = await scrapeWebsiteWithFailover(url, usePlaywright, cache, retries);

                const processingTime = Date.now() - startTime;
                const result = {
                    success: true,
                    url,
                    data,
                    processingTime,
                    workerId
                };

                results.push(result);
                if (onProgress) onProgress(result);
            } catch (err) {
                const result = {
                    success: false,
                    url: typeof config === 'string' ? config : config.url,
                    error: err.message,
                    workerId
                };
                results.push(result);
                if (onProgress) onProgress(result);
            }
        }
    };

    // Spawn worker tasks
    for (let i = 0; i < concurrency; i++) {
        workers.push(worker(i));
    }

    // Wait for all workers
    await Promise.all(workers);

    // Return results with cache stats
    return {
        results,
        stats: {
            total: urlConfigs.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            cacheStats: cache ? cache.stats() : null
        }
    };
}

// --- OPTIMIZATION: Stealth mode setup for Playwright ---
export async function setupPlaywrightStealth(page) {
    // Override navigator.webdriver
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false
        });
    });

    // Set up Chrome runtime object
    await page.addInitScript(() => {
        window.chrome = {
            runtime: {}
        };
    });

    // Spoof language preferences
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en']
        });
    });

    // Randomize screen resolution
    const width = 1920 + Math.random() * 100;
    const height = 1080 + Math.random() * 100;
    await page.setViewportSize({ width: Math.floor(width), height: Math.floor(height) });
}

// --- OPTIMIZATION: Enhanced Playwright scraper with stealth + user agent rotation ---
export async function scrapeWebsitePlaywrightEnhanced(url, retries = 3, timeout = 30000) {
    let normalizedUrl = url;
    try {
        new URL(normalizedUrl);
    } catch (e) {
        throw new Error(`Invalid URL format: ${url} - ${e.message}`);
    }

    let browser = null;
    let lastErr = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            browser = await chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const context = await browser.newContext({
                userAgent: getRandomUserAgent(),
                viewportSize: { width: 1920, height: 1080 },
                locale: 'en-US',
                timezoneId: 'America/New_York',
                geolocation: { latitude: 40.7128, longitude: -74.0060 },
                permissions: []
            });

            const page = await context.newPage();

            // Apply stealth measures
            await setupPlaywrightStealth(page);

            await page.goto(normalizedUrl, {
                waitUntil: 'networkidle',
                timeout
            });

            await page.waitForLoadState('networkidle');

            // Extract title safely
            const title =
                await page.locator('head > title', { strict: false })
                    .first()
                    .textContent()
                    .catch(() => null)
                ||
                await page.locator('h1', { strict: false })
                    .first()
                    .textContent()
                    .catch(() => null)
                ||
                await page.locator('meta[property="og:title"]')
                    .getAttribute('content')
                    .catch(() => null)
                ||
                'Untitled';

            // Extract meta description
            const description =
                await page.locator('meta[name="description"]')
                    .getAttribute('content')
                    .catch(() => null)
                || '';

            // Extract author
            const author =
                await page.locator('meta[name="author"]').getAttribute('content').catch(() => null)
                ||
                await page.locator('meta[property="article:author"]').getAttribute('content').catch(() => null)
                || '';

            // Extract main content
            let content = '';
            const selectors = [
                'article', 'main', '[role="main"]', '.content', '.post-content',
                '.article-content', '#content', 'body'
            ];

            for (const selector of selectors) {
                const elem = page.locator(selector).first();
                if ((await elem.count()) > 0) {
                    await page.evaluate(sel => {
                        const e = document.querySelector(sel);
                        if (!e) return;
                        e.querySelectorAll('script,style,nav,header,footer,.advertisement')
                            .forEach(n => n.remove());
                    }, selector);
                    content = await elem.innerHTML();
                    break;
                }
            }

            if (!content) {
                content = await page.evaluate(() => {
                    document.querySelectorAll('script,style,nav,header,footer')
                        .forEach(e => e.remove());
                    return document.body.innerHTML || '';
                });
            }

            const text = (
                await page.textContent('body').catch(() => '')
            ).trim().slice(0, 500);

            await page.close();
            await context.close();
            await browser.close();

            return {
                url: normalizedUrl,
                title: (title || '').trim(),
                html: content,
                text: text,
                metadata: {
                    description: (description || '').trim(),
                    author: (author || '').trim()
                },
                _isPlaywright: true,
                _userAgent: getRandomUserAgent()
            };

        } catch (err) {
            lastErr = err;
            console.warn(`Attempt ${attempt}/${retries} failed (Playwright) for ${url}: ${err.message}`);

            if (attempt === retries) {
                console.error(`Final failure for ${url}: ${err.message}`);
            }

            if (browser) {
                try { await browser.close(); } catch {}
            }

            if (attempt < retries) {
                await new Promise(res => setTimeout(res, attempt * 1000));
            }
        }
    }

    throw lastErr || new Error('Failed to scrape URL with Playwright');
}
