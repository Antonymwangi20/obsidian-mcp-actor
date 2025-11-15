# Optimization Examples - Real-World Usage

This guide shows practical examples of using the 8 optimizations in real scenarios.

---

## **Example 1: Lightning-Fast Bulk Scraping (5 URLs at once)**

### Scenario
You have 100 research papers to scrape. Time is money.

### Configuration
**input.json**:
```json
{
  "bulkMode": true,
  "urls": [
    "https://arxiv.org/abs/2301.00001",
    "https://arxiv.org/abs/2301.00002",
    "https://arxiv.org/abs/2301.00003",
    "https://arxiv.org/abs/2301.00004",
    "https://arxiv.org/abs/2301.00005"
  ],
  "vaultPath": "/Users/you/Obsidian/Research",
  "folderPath": "Papers",
  "usePlaywright": false,
  "rateLimitDelay": 1000,
  "addMetadata": true,
  "autoTag": true,
  "autoLink": true,
  "tags": ["research", "papers"]
}
```

### What Happens
```
npm start

Starting Obsidian MCP Actor...
Bulk Mode: Processing 5 URLs

[1/5] ━━ Processing: https://arxiv.org/abs/2301.00001 ━━
[2/5] ━━ Processing: https://arxiv.org/abs/2301.00002 ━━
[3/5] ━━ Processing: https://arxiv.org/abs/2301.00003 ━━
[4/5] ━━ Processing: https://arxiv.org/abs/2301.00004 ━━
[5/5] ━━ Processing: https://arxiv.org/abs/2301.00005 ━━

✓ All 5 processed concurrently (5 workers running in parallel)
⏱️ Time: ~2.8s per URL (vs 14s sequential)
= 5× faster ✨

✓ Successfully created note: arxiv-paper-1
✓ Successfully created note: arxiv-paper-2
✓ Successfully created note: arxiv-paper-3
✓ Successfully created note: arxiv-paper-4
✓ Successfully created note: arxiv-paper-5

✓ Internal linking completed (discovered 8 cross-references)
```

### Result
- **100 URLs** → **20 seconds** (vs 5+ minutes)
- User agents rotated automatically
- Auto-tags extracted from abstract
- Cross-references added

---

## **Example 2: JavaScript-Heavy Sites with Automatic Fallback**

### Scenario
You need to scrape a React SPA that requires JavaScript execution.

### Configuration
**input.json**:
```json
{
  "url": "https://news.ycombinator.com",
  "vaultPath": "/Users/you/Obsidian/News",
  "usePlaywright": true,
  "playwrightTimeout": 45000,
  "addMetadata": true,
  "tags": ["tech", "startup-news"]
}
```

### What Happens
```
npm start

Starting Obsidian MCP Actor...
Single Mode: Processing 1 URL

[1/1] ━━ Processing: https://news.ycombinator.com ━━
Step 1: Scraping website...
  → Using Playwright mode (JavaScript rendering enabled)
  → Random user agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...
  ✓ Stealth mode enabled (navigator.webdriver hidden)

[Playwright loads the site, waits for JS to render]
  ✓ Found 30 story links (dynamic content)

Step 2: Converting to Markdown...
Step 3: Saving to Obsidian vault...
✓ Successfully created note: news-ycombinator-{timestamp}

Step 4: Adding internal links...
  → Added 5 cross-reference links (matching tags)
✓ Internal linking completed
```

### If Playwright Fails
```
[Attempt 1/3 failed (Playwright): timeout]
  ⚠ Playwright failed, falling back to Cheerio...
  
[Cheerio scrapes the static HTML]
  ✓ Fallback successful (60% content recovery)
  → Using Cheerio mode (fast static parsing)

[Rest proceeds normally with Cheerio data]
```

### Result
- ✅ JavaScript content fully rendered
- ✅ Anti-bot evasion enabled (stealth mode)
- ✅ User agent randomized
- ✅ Automatic fallback if Playwright fails
- ⏱️ Time: ~4-5 seconds

---

## **Example 3: Smart Caching (Avoid Re-Scraping)**

### Scenario
You're updating your research vault daily. Same 20 URLs get re-scraped.

### The Problem (Before)
```
Day 1: Scrape 20 URLs → 56 seconds
Day 2: Scrape same 20 URLs → 56 seconds
Day 3: Scrape same 20 URLs → 56 seconds
= Waste of time and bandwidth
```

### Solution: Programmatic Usage
**custom-sync.js**:
```javascript
import { scrapeMany, ScrapeCache } from './lib/helpers.js';

const cache = new ScrapeCache();
const urls = [
  "https://blog.example.com/post1",
  "https://blog.example.com/post2",
  // ... 18 more
];

// First run
console.log("First run (fresh scrape)...");
let result = await scrapeMany(urls, {
  concurrency: 5,
  useCache: true,
  usePlaywright: false
});
console.log(result.stats.cacheStats);
// Output: { hits: 0, misses: 20, total: 20, hitRate: "0.0" }

// Second run (same day, before clear)
console.log("Second run (from cache)...");
result = await scrapeMany(urls, {
  concurrency: 5,
  useCache: true,
  usePlaywright: false
});
console.log(result.stats.cacheStats);
// Output: { hits: 20, misses: 0, total: 20, hitRate: "100.0" }
// Time: ~0.5 seconds instead of 56 seconds!
```

### Result
- 🚀 **100% cache hit** → 0.5s (vs 56s)
- 📊 Cache stats show efficiency
- 💾 Perfect for daily refresh jobs
- 🎯 Identify which URLs changed

---

## **Example 4: Concurrent + Caching + Failover (Triple Power)**

### Scenario
You're importing 500 diverse URLs. Some are dynamic, some are static, some might fail.

### Configuration
```json
{
  "bulkMode": true,
  "urls": [
    "https://github.com/trending",
    "https://example.com",
    "https://react-spa.app",
    "https://blocked-by-cloudflare.com",
    // ... 496 more
  ],
  "vaultPath": "/Users/you/Obsidian",
  "usePlaywright": true,
  "playwrightTimeout": 60000,
  "rateLimitDelay": 200,
  "downloadImages": false,
  "autoLink": true
}
```

### What Happens
```
npm start

Starting Obsidian MCP Actor...
Bulk Mode: Processing 500 URLs

[1/500] ━━ Processing: https://github.com/trending ━━
Step 1: Scraping website...
  → Using Playwright mode
  → Random UA #3: Firefox on Linux
  ✓ Stealth mode active

[2/500] ━━ Processing: https://example.com ━━
[3/500] ━━ Processing: https://react-spa.app ━━
[4/500] ━━ Processing: https://blocked-by-cloudflare.com ━━
[5/500] ━━ Processing: https://github.com/trending ← CACHE HIT!
  ✓ Cache hit for https://github.com/trending (same URL within 1 hour)

... [5 workers running in parallel] ...

[URL 4] Playwright timeout on Cloudflare site
  ⚠ Falling back to Cheerio...
  [Cheerio processes static content]
  ✓ Partial content recovered (70%)

... [continues] ...

━━ BULK IMPORT SUMMARY ━━
Total: 500 URLs processed
Successful: 487
Failed: 13
Cache Performance:
  - Hits: 42 (8.4%)
  - Misses: 458
  - Hit Rate: 8.4%

━━ PERFORMANCE METRICS ━━
Total time: 68 seconds
Processed URLs: 487
Average per-URL: 0.14s (with cache hits factored in)
Bytes downloaded (approx): 24.3 MB

Results saved to vault: 487 new notes created
```

### Breakdown
- **Concurrency**: 5 workers → processes 5 URLs simultaneously
- **User Agents**: Random rotation → reduced blocking
- **Stealth Mode**: Hides Playwright detection
- **Caching**: Duplicate URLs skipped
- **Failover**: Cloudflare site fell back to Cheerio
- **Performance**: 500 URLs in 68 seconds (~0.14s per URL!)

### Result
- ✅ **99.4% success rate** (487/500)
- ✅ Mixed Playwright + Cheerio results
- ✅ Cache helped skip 42 duplicate URLs
- ✅ 68 seconds for 500 URLs
- 📈 ~7× faster than sequential + user agent protection

---

## **Example 5: Smart Auto-Linking (Knowledge Graph)**

### Scenario
You have notes on different technologies. Auto-linking should connect them.

### Setup
Vault structure:
```
MyResearch/
  AI/
    Neural Networks.md
    Machine Learning.md
    Deep Learning.md
  Cloud/
    Kubernetes.md
    Docker.md
  DevOps/
    (new folder)
```

### New Note Created
You scrape: "Cloud-Native Architecture with Kubernetes & Docker"

Tags extracted: `["kubernetes", "docker", "cloud-native", "devops"]`

### Auto-Linking Result
```
# Cloud-Native Architecture

> 🔗 Source: ...

---

## Related Notes

- Related: [[Kubernetes.md]]
- Related: [[Docker.md]]
```

**Behind the scenes**:
1. Scanned vault for existing notes
2. Found `Kubernetes.md` has tags `["kubernetes", "infrastructure"]`
3. Found `Docker.md` has tags `["docker", "containers"]`
4. Both share tags with new note → added links
5. New note links to existing notes

### Benefits
- 🔗 Automatic knowledge graph building
- 📚 No manual linking needed
- 🎯 Context-aware connections
- ✨ Vault grows smarter over time

---

## **Example 6: Performance Comparison - Before vs After**

### Task
Scrape 100 tech blog posts for research vault

### Before Optimizations
```
Sequential Processing (1 worker):
- User Agent: Static (all requests use same UA)
- Concurrency: 1 URL at a time
- Cache: None
- Fallback: Fail on first error

Time: 100 URLs × 2.8s avg = 280 seconds (4.7 minutes)
Success Rate: 87% (13 blocked by rate-limiting)
Memory: ~50 MB
```

### After Optimizations
```
Concurrent + Cache + UA Rotation + Fallback:
- User Agent: Random (5 different UA strings)
- Concurrency: 5 workers parallel
- Cache: 8 duplicate URLs from previous runs
- Fallover: Playwright → Cheerio when needed

Time: (92 fresh + 8 cached) / 5 workers × 2.8s = 52 seconds
Success Rate: 99% (1 timeout, fell back to Cheerio)
Memory: ~150 MB (5 workers × 30 MB each)

Speed-up: 280s → 52s = 5.4× faster ✨
Block-reduction: 87% → 99% success ✨
Cache-hit: 8 URLs skipped entirely ✨
```

---

## **Example 7: Programmatic API Usage**

### Direct Function Calls
```javascript
import { scrapeMany, ScrapeCache, scrapeWebsiteWithFailover } from './lib/helpers.js';

// Single URL with full optimizations
const data = await scrapeWebsiteWithFailover(
  "https://example.com",
  usePlaywright = true,      // Try Playwright first
  cache = new ScrapeCache(), // Cache results
  retries = 3                // 3 retry attempts
);

// Batch with progress tracking
const results = await scrapeMany(
  [
    "https://site1.com",
    "https://site2.com",
    "https://site3.com"
  ],
  {
    concurrency: 3,
    usePlaywright: true,
    useCache: true,
    onProgress: (result) => {
      if (result.success) {
        console.log(`✓ ${result.url} (${result.processingTime}ms, worker ${result.workerId})`);
      } else {
        console.error(`✗ ${result.url}: ${result.error}`);
      }
    }
  }
);

console.log(results.stats);
// {
//   total: 3,
//   successful: 3,
//   failed: 0,
//   cacheStats: { hits: 0, misses: 3, total: 3, hitRate: "0.0" }
// }
```

---

## **Example 8: Error Recovery**

### Scenario
Scraping a site that has intermittent issues

### Configuration
```json
{
  "url": "https://flaky-api.example.com",
  "usePlaywright": true,
  "rateLimitDelay": 2000,
  "vaultPath": "/Users/you/Obsidian"
}
```

### Execution with Recovery
```
Step 1: Scraping website...
  → Using Playwright mode
  Attempt 1/3 failed: timeout after 30s
  ⏳ Waiting 1s before retry...

  Attempt 2/3 failed: connection reset
  ⏳ Waiting 2s before retry...

  Attempt 3/3: SUCCESS!
  ✓ Recovered after exponential backoff
  
Step 2: Converting to Markdown...
Step 3: Saving to Obsidian vault...
✓ Successfully created note
```

### Built-in Recovery Features
- ✅ Exponential backoff (1s, 2s, 3s)
- ✅ User agent rotation between retries
- ✅ Automatic Cheerio fallback
- ✅ Detailed error logging
- ✅ Continues processing other URLs

---

## **Summary**

These examples show real-world scenarios where the 8 optimizations shine:

| Example | Primary Optimization | Benefit |
|---------|---------------------|---------|
| Bulk Scraping | Concurrency | 5× faster |
| JavaScript Sites | Stealth Mode + Playwright | JS rendering |
| Re-scraping | Caching | Skip known URLs |
| Triple Power | All 8 combined | 7× faster + 99% success |
| Auto-linking | Smart linking | Knowledge graph |
| Performance | Comparison | Before vs after |
| API Usage | Programmatic | Custom workflows |
| Error Recovery | Retry + Fallback | Reliability |

---

**Ready to make your Actor production-grade?** Start with Example 1, then explore the others. 🚀
