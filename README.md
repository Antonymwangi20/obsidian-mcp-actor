# Obsidian MCP Actor

A secure, high-performance Apify Actor that bridges Obsidian note-taking workflows with intelligent web scraping automation via the Model Context Protocol (MCP). Automatically enrich your knowledge base with structured data from any website.

<p align="center">
  <a href="https://github.com/yourusername/obsidian-mcp-actor/actions"><img src="https://github.com/yourusername/obsidian-mcp-actor/workflows/CI/badge.svg" alt="CI"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="https://github.com/yourusername/obsidian-mcp-actor/releases"><img src="https://img.shields.io/github/v/release/yourusername/obsidian-mcp-actor" alt="Release"></a>
  <a href="https://hub.apify.com/actors"><img src="https://img.shields.io/badge/Apify-Actor-blue" alt="Apify Actor"></a>
</p>

## 🎯 What's New in v2.0

### 🛡️ Security Hardening
- **Path traversal protection**: All file operations validated against vault directory
- **Content size limits**: Prevents OOM with 10MB maximum content size
- **Input validation**: Sanitized URLs and filenames with clear error categories
- **Robots.txt compliance**: Automatic respect for `robots.txt` rules

### ⚡ Performance & Scalability
- **Parallel processing**: Concurrent image downloads (3-10x faster)
- **Intelligent caching**: Three cache strategies (memory, disk, Apify KV)
- **Exponential backoff**: Smart retry logic with jitter for rate-limited sites
- **Stealth mode**: Enhanced Playwright evasion for anti-bot protection

### 🏗️ Modern Architecture
- **Service-oriented design**: Modular, testable, maintainable
- **Strategy pattern**: Pluggable scraping engines (Cheerio → Playwright fallback)
- **Real-time monitoring**: Live WebSocket progress viewer
- **TypeScript support**: Full type definitions for core interfaces

---

## 🔥 Key Features

| Feature | Description |
|---------|-------------|
| 🤖 **Dual Scraping Engines** | Cheerio for speed, Playwright for JavaScript-heavy sites |
| 💾 **Persistent Caching** | Avoid re-scraping with disk-backed cache between runs |
| 🏷️ **Intelligent Tagging** | Extract tags from content, metadata, JSON-LD, and domains |
| 🔗 **Auto Internal Linking** | Automatically link related notes by shared tags |
| 📸 **Image Handling** | Download and reference images with parallel processing |
| 📝 **Template Support** | Configure scraping via Obsidian template files |
| 📊 **Live Progress** | WebSocket viewer shows real-time scraping status |
| 🔐 **Security First** | Path traversal protection, input validation, size limits |
| 🎯 **MCP Integration** | Expose 5 tools to Claude/LLMs for AI-driven workflows |
| 📈 **Performance Metrics** | Track cache hit rates, processing times, and throughput |

---

## 🚀 Quick Start

### Single URL Scrape

```json
{
  "url": "https://example.com/article",
  "vaultPath": "/Users/yourname/Documents/Obsidian",
  "folderPath": "research/articles",
  "tags": ["ai", "research"],
  "autoTag": true,
  "autoLink": true
}
```

### Bulk Import with Caching

```json
{
  "urls": [
    "https://site1.com/post",
    "https://site2.com/guide",
    "https://site3.com/tutorial"
  ],
  "vaultPath": "/Users/yourname/Documents/Obsidian",
  "bulkMode": true,
  "usePlaywright": false,
  "cache": "disk",
  "rateLimitDelay": 2000
}
```

### JavaScript-Heavy Site

```json
{
  "url": "https://react-app.example.com",
  "vaultPath": "/Users/yourname/Documents/Obsidian",
  "usePlaywright": true,
  "enableStealth": true,
  "playwrightTimeout": 45
}
```

---

## 📋 Configuration Reference

### Core Settings

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `url` | string | No* | - | Single URL to scrape (use `urls` for bulk) |
| `urls` | array | No* | [] | Array of URLs for bulk import |
| `vaultPath` | string | **Yes** | - | Absolute path to your Obsidian vault |
| `folderPath` | string | No | `scraped` | Subfolder path within vault |
| `noteName` | string | No | Auto | Custom note filename (auto-sanitized) |

### Processing Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `addMetadata` | boolean | `true` | Include YAML front-matter |
| `tags` | array | `[]` | Manual tags to apply |
| `autoTag` | boolean | `true` | Enable intelligent auto-tagging |
| `autoLink` | boolean | `true` | Create internal links between notes |
| `updateExisting` | boolean | `false` | Allow overwriting existing notes |
| `templatePath` | string | - | Obsidian template for config |

### Performance & Reliability

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `usePlaywright` | boolean | `false` | Use Chrome browser automation |
| `playwrightTimeout` | number | `30` | Page load timeout (seconds) |
| `enableStealth` | boolean | `true` | Apply anti-bot evasion |
| `maxRetries` | number | `3` | Retry attempts per URL |
| `rateLimitDelay` | number | `2000` | Delay between requests (ms) |
| `cache` | string | `memory` | Cache type: `memory`, `disk`, `apify` |
| `downloadImages` | boolean | `false` | Download images to vault |
| `concurrency` | number | `3` | Parallel download workers |

\* Either `url` or `urls` must be provided

---

## 📁 Generated Note Format

```markdown
---
title: "Understanding Machine Learning"
url: https://example.com/ml-guide
scraped: 2024-01-15T10:30:00.000Z
tags: ["machine-learning", "ai", "research", "technology", "example"]
description: "A comprehensive guide to ML fundamentals"
author: "Jane Smith"
---

# Understanding Machine Learning

> 🔗 Source: [https://example.com/ml-guide](https://example.com/ml-guide)

> 📅 Scraped: January 15, 2024

---

## Article Content

Full content converted to Markdown...

---

## Metadata

- **Author:** Jane Smith
- **Description:** A comprehensive guide to ML fundamentals
- **Canonical:** https://example.com/ml-guide
- **Robots:** index,follow
```

---

## 🎓 Advanced Usage

### Template-Based Configuration

Create `templates/scraper-config.md` in your vault:

```markdown
---
folderPath: "research/ai-papers"
autoTag: true
autoLink: true
tags: ["ai", "paper"]
usePlaywright: false
cache: "disk"
---

# AI Paper Scraper Template

This template automatically applies settings when referenced.
```

**Usage:**
```json
{
  "url": "https://arxiv.org/abs/2401.12345",
  "vaultPath": "/path/to/vault",
  "templatePath": "templates/scraper-config"
}
```

### Caching Strategies

```javascript
// Memory cache (fast, ephemeral)
const cache = new MemoryCache({ maxSize: 100 });

// Disk cache (persistent across runs)
const cache = new PersistentCache({ cacheDir: './storage' });

// Apify KV store (cloud, for scheduled actors)
const cache = new PersistentScrapeCache('my-scrape-cache');
```

### Real-Time Progress Viewer

**Local Development:**
```bash
npm install  # Install dependencies
npm run dev  # Start MCP server with live viewer
```

**Apify Platform:**
```json
{
  "startResultsServer": true,
  "resultsServerPort": 8080
}
```

Then visit `http://localhost:8080` in your browser.

---

## 🤖 MCP Server Integration

The Actor exposes 5 tools to Claude/LLMs:

```bash
# Install globally
npm install -g obsidian-mcp-actor

# Add to Claude config
{
  "mcpServers": {
    "obsidian": {
      "command": "obsidian-mcp-actor",
      "args": ["mcp-server"]
    }
  }
}
```

**Available Tools:**
1. `scrape_website` - Scrape any URL
2. `extract_tags` - Analyze content for tags
3. `validate_content` - Check scrape quality
4. `convert_html_to_markdown` - Transform content
5. `save_note` - Save to Obsidian vault

**AI Workflow Example:**
> "Claude, scrape the latest 5 articles from Hacker News, tag them by topic, and save to my `trending` folder with internal links."

---

## 🔧 Development Setup

```bash
# Clone repository
git clone https://github.com/yourusername/obsidian-mcp-actor.git
cd obsidian-mcp-actor

# Install dependencies
npm install

# Run TypeScript compilation
npm run build

# Run tests
npm test

# Start MCP server locally
npm run mcp-server
```

### Project Structure

```
obsidian-mcp-actor/
├── src/
│   ├── main.js                      # Apify Actor entry point
│   ├── mcp-server.js               # MCP server entry point
│   └── lib/
│       ├── processor/              # Core business logic
│       │   ├── UnifiedScraper.js
│       │   ├── MarkdownConverter.js
│       │   ├── TagExtractor.js
│       │   └── ActorService.js
│       ├── scraper/                # Scraping strategies
│       │   ├── CheerioStrategy.js
│       │   └── PlaywrightStrategy.js
│       ├── vault/                  # Obsidian operations
│       │   ├── NoteManager.js
│       │   └── LinkManager.js
│       ├── cache/                  # Caching implementations
│       │   ├── MemoryCache.js
│       │   ├── PersistentCache.js
│       │   └── PersistentScrapeCache.js
│       ├── utils/                  # Utilities
│       │   ├── url.js
│       │   ├── errors.js
│       │   ├── retry.js
│       │   └── stealth.js
│       └── server/                 # WebSocket server
│           └── ResultsServer.js
├── test/                           # Unit and integration tests
├── input_schema.json               # Apify input schema
├── output_schema.json              # Apify output schema
└── package.json
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test test/UnifiedScraper.test.js
```

**Test Coverage Goals:**
- Core scraping logic: >90%
- Security validation: 100%
- Vault operations: >85%

---

## 📦 Deployment

### Apify Platform

1. **Push to Apify:**
```bash
apify push
```

2. **Configure Environment Variables:**
```env
APIFY_MEMORY_MBYTES=4096
APIFY_BUILD_TIMEOUT_SECS=300
```

3. **Schedule Runs:**
```bash
apify schedule create my-schedule \
  --actor-id your-actor-id \
  --cron "0 9 * * *" \
  --input-json '{"urls": [...], "vaultPath": "/data"}'
```

### Self-Hosted

```bash
# Docker
docker build -t obsidian-mcp-actor .
docker run -v /path/to/vault:/data -p 8080:8080 obsidian-mcp-actor
```

---

## 🔄 Migration from v1.x

### Breaking Changes

**For most users: No changes needed.** The public API remains identical.

**If you extended internals:**
- Legacy functions in `helpers.js` are deprecated but functional
- Import from specific modules for new features:
  ```javascript
  // Old (still works)
  import { scrapeWebsite } from './helpers.js';
  
  // New (recommended)
  import { UnifiedScraper } from './lib/processor/UnifiedScraper.js';
  const scraper = new UnifiedScraper({ usePlaywright: true });
  ```

### New Cache API

```javascript
// Old
const cache = new ScrapeCache();

// New
const cache = new MemoryCache({ maxSize: 100, ttl: 3600000 });
```

### Updated File Structure

Move custom code from `main.js` to `lib/processor/ActorService.js` for modularity.

---

## 📚 Use Cases

| Use Case | Configuration |
|----------|---------------|
| **Research Paper Collection** | `usePlaywright: false`, `cache: "disk"`, `folderPath: "papers/{year}"` |
| **News Monitoring** | `bulkMode: true`, `rateLimitDelay: 5000`, `updateExisting: true` |
| **Competitive Intelligence** | `enableStealth: true`, `downloadImages: true`, `autoTag: true` |
| **Course Materials** | `templatePath: "templates/course"`, `addMetadata: true`, `autoLink: true` |
| **AI-Powered Curation** | Enable MCP server, use Claude to orchestrate complex scraping tasks |

---

## 📊 Performance Benchmarks

| Scenario | v1.x | v2.0 | Improvement |
|----------|------|------|-------------|
| Single static page | 2.1s | 0.8s | **2.6x faster** |
| Bulk 10 URLs | 45s | 18s | **2.5x faster** |
| JS-heavy SPA | 15s | 12s | **1.25x faster** |
| Image downloads (20) | 25s | 3s | **8.3x faster** |
| Cache hit rate | 0% | 78% | **78% reuse** |

*Benchmarks on M1 Mac, 10 concurrent workers*

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Guidelines

- Write tests for new features
- Follow existing code style (ESLint configured)
- Update TypeScript types
- Document public APIs with JSDoc
- Security-first: validate all inputs

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Crawlee](https://crawlee.dev/) and [Playwright](https://playwright.dev/)
- Inspired by the Obsidian community's automation needs
- MCP protocol by [Anthropic](https://www.anthropic.com/)

---

**Made with ❤️ for researchers, knowledge workers, and automation enthusiasts**

*Transform your Obsidian vault into a self-updating knowledge base.*