import cheerio from 'cheerio';

export function extractEnhancedMetadata($, url) {
    const metadata = { canonical: ($('link[rel="canonical"]').attr('href') || url), robots: ($('meta[name="robots"]').attr('content') || 'index,follow'), og: {}, twitter: {} };
    $('meta[property^="og:"]').each((i, el) => {
        metadata.og[$(el).attr('property').replace('og:', '')] = $(el).attr('content');
    });
    $('meta[name^="twitter:"]').each((i, el) => {
        metadata.twitter[$(el).attr('name').replace('twitter:', '')] = $(el).attr('content');
    });
    return metadata;
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
