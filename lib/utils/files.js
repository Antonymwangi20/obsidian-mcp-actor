import crypto from 'crypto';
export function getContentHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 8);
}
import fs from 'fs/promises';
import path from 'path';
import { sanitizeFileName } from './url.js';

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

export async function downloadImages(scrapedData, vaultPath, folderPath = 'scraped', imagesFolder = 'images', options = {}) {
    const { concurrency = 3, maxImageSize = 5 * 1024 * 1024, maxImages = 20 } = options;
    if (!scrapedData || !scrapedData._images || scrapedData._images.length === 0) return [];

    const baseDir = path.join(vaultPath, folderPath, imagesFolder);
    await fs.mkdir(baseDir, { recursive: true });

    const queue = scrapedData._images.slice(0, maxImages);
    const results = [];

    const allowedExt = new Set(['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp']);

    const worker = async () => {
        while (queue.length > 0) {
            const img = queue.shift();
            if (!img || !img.src) continue;
            try {
                let src = img.src;
                if (src.startsWith('//')) src = 'https:' + src;
                if (!src.startsWith('http')) {
                    try {
                        const u = new URL(src, scrapedData.url);
                        src = u.href;
                    } catch (e) {
                        continue;
                    }
                }

                const ext = path.extname(new URL(src).pathname).toLowerCase() || '.jpg';
                if (!allowedExt.has(ext)) continue;

                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10000);
                const res = await fetch(src, { signal: controller.signal });
                clearTimeout(timeout);
                if (!res.ok) continue;

                const buffer = Buffer.from(await res.arrayBuffer());
                if (buffer.length > maxImageSize) continue;

                const fileName = `${sanitizeFileName(path.basename(new URL(src).pathname) || 'img') || 'image'}-${Date.now()}${ext}`;
                const outPath = path.join(baseDir, fileName);
                await fs.writeFile(outPath, buffer);
                results.push({ src: src, local: path.join(folderPath, imagesFolder, fileName) });
            } catch (e) {
                // skip failures
                continue;
            }
        }
    };

    const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
    await Promise.all(workers);
    return results;
}

export async function checkDuplicateNote(vaultPath, fileName) {
    const fullPath = path.join(vaultPath, `${fileName}.md`);
    try {
        await fs.access(fullPath, fs.constants.F_OK);
        return true;
    } catch {
        return false; // does not exist
    }
}
