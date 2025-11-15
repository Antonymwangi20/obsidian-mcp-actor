import fs from 'fs/promises';
import path from 'path';
import cheerio from 'cheerio';

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
