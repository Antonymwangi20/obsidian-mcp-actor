import cheerio from 'cheerio';

export function extractStructuredDataSafe(html) {
    if (!html) return [];
    const $ = cheerio.load(html);
    const structured = [];
    $('script[type="application/ld+json"]').each((i, el) => {
        try {
            const jsonText = $(el).html();
            if (jsonText) structured.push(JSON.parse(jsonText));
        } catch (e) {
            console.warn(`Skipping invalid JSON-LD: ${e.message}`);
        }
    });
    return structured;
}

export function extractCleanText($) {
    if (!$) return '';
    const selectors = ['article', 'main', '[role="main"]', '.content', '.post-content', '#content'];
    for (const sel of selectors) {
        const elem = $(sel).first();
        if (elem.length > 0) {
            const text = elem.clone().find('script, style, nav, header, footer, aside, [aria-hidden="true"], .advertisement, .cookie-banner, .popup, .modal, noscript').remove().end().text();
            if (text && text.trim().length > 50) {
                return text.replace(/\s+/g, ' ').trim().substring(0, 5000);
            }
        }
    }
    return $('body').text().replace(/\s+/g, ' ').trim().substring(0, 5000) || '';
}

export function extractImagesEnhanced(html) {
    if (!html) return [];
    const $ = cheerio.load(html);
    const images = [];
    const seen = new Set();
    
    $('img').each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
        if (src && !seen.has(src)) {
            images.push({ src, alt: $(el).attr('alt') || '', srcset: $(el).attr('srcset') || null });
            seen.add(src);
        }
    });
    
    $('[style*="background-image"]').each((i, el) => {
        const match = $(el).attr('style').match(/url\(['"]?([^'\"]+)['"]?\)/);
        if (match && !seen.has(match[1])) {
            images.push({ src: match[1], alt: 'bg-image', srcset: null });
            seen.add(match[1]);
        }
    });
    
    return images;
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
