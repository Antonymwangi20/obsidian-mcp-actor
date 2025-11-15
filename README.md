# Obsidian MCP Actor

A powerful Apify Actor that bridges Obsidian note-taking workflows with web scraping automation via the Model Context Protocol (MCP). Automatically enrich your knowledge base with structured data from websites, research sources, and online content.

## 🎯 Key Features

### Automated Note Creation
- **Smart HTML-to-Markdown conversion** using Turndown for perfect formatting
- **YAML front-matter** with metadata (title, URL, author, description)
- **Flexible naming** with auto-generated sanitized file names from page titles

### Intelligent Tagging & Linking
- **Auto-tagging**: Analyzes content to extract relevant tags from a curated keyword list
- **Domain-based tagging**: Automatically tags notes by source domain
- **Automatic internal linking**: Creates bidirectional links between related notes based on shared tags
- **Manual tag support**: Add custom tags to all imported content

### Bulk Import & Organization
- **Single URL mode**: Scrape and import one article at a time
- **Bulk mode**: Process multiple URLs in a single run
- **Smart organization**: Automatically organize notes into vault subfolder structures
- **Note updating**: Refresh existing notes with fresh content while preserving structure

### Template-Based Configuration
- **Obsidian template support**: Define scraping parameters and output formats in template files
- **Flexible front-matter**: Extract and apply custom metadata fields
- **Conditional formatting**: Apply different processing rules based on content type

### Scheduled Scraping Jobs
- **See [SCHEDULED_SCRAPING.md](./SCHEDULED_SCRAPING.md) for complete setup guide**

### AI-Powered Integration (MCP)
- **Claude integration**: Expose scraping capabilities to Claude/LLM via Model Context Protocol
- **5 exposed tools**: scrape_website, extract_tags, validate_content, convert_html_to_markdown, save_note
- **AI workflows**: Let Claude orchestrate complex scraping and note creation tasks
- **See [MCP_SERVER.md](./MCP_SERVER.md) for integration guide**

## ⚙️ Configuration

### Input Schema

The Actor accepts the following parameters:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `url` | string | No (unless `urls` empty) | - | Single URL to scrape |
| `urls` | array | No (unless `url` empty) | [] | Array of URLs for bulk import |
| `vaultPath` | string | **YES** | - | Absolute path to your Obsidian vault |
| `noteName` | string | No | Auto-generated | Custom name for the note file |
| `folderPath` | string | No | `scraped` | Subfolder path within vault for saving |
| `addMetadata` | boolean | No | `true` | Include YAML front-matter |
| `tags` | array | No | [] | Manual tags to add to notes |
| `autoTag` | boolean | No | `true` | Enable intelligent auto-tagging |
| `autoLink` | boolean | No | `true` | Enable automatic internal linking |
| `bulkMode` | boolean | No | `false` | Process multiple URLs at once |
| `updateExisting` | boolean | No | `false` | Update existing notes instead of creating new ones |
| `templatePath` | string | No | - | Path to Obsidian template file for custom config |

### Example Input (Single URL)

```json
{
  "url": "https://example.com/article",
  "vaultPath": "/Path/to/your/vault",
  "noteName": "my-research",
  "folderPath": "research/web-articles",
  "addMetadata": true,
  "tags": ["important", "research"],
  "autoTag": true,
  "autoLink": true
}
```

### Example Input (Bulk Import)

```json
{
  "urls": [
    "https://example.com/article1",
    "https://example.com/article2",
    "https://example.com/article3"
  ],
  "vaultPath": "/Path/to/your/vault",
  "bulkMode": true,
  "folderPath": "research/bulk-import",
  "autoTag": true,
  "autoLink": true
}
```

### Example Input (With Template)

```json
{
  "url": "https://example.com/news",
  "vaultPath": "/Path/to/your/vault",
  "templatePath": "templates/news-scraper",
  "updateExisting": true
}
```

## 📝 Output Format

### Generated Markdown Notes

```markdown
---
title: "Example Article Title"
url: https://example.com/article
scraped: 2025-11-15T10:30:00.000Z
tags: [research, technology, security, example]
description: "Article description from meta tags"
author: "Article Author"
---

# Example Article Title

> 🔗 Source: [https://example.com/article](https://example.com/article)

> 📅 Scraped: November 15, 2025

---

## Article Content

Full article content converted to Markdown...

---

## Metadata

- **Author:** Article Author
- **Description:** Article description from meta tags
```

### Auto-Generated Tags

Tags are automatically extracted from:
- Content analysis using keyword matching
- Domain name (e.g., `github` from github.com)
- Manual tags provided in input

### Internal Links

When `autoLink` is enabled, the Actor:
- Scans your vault for existing notes
- Identifies shared tags between notes
- Adds bidirectional links in the "Related" section

## 🎓 Advanced Features

### Template-Based Customization

Create an Obsidian template file (e.g., `templates/news-scraper.md`):

```markdown
---
folderPath: "research/news"
autoTag: true
autoLink: true
---

# Template Configuration

This template defines scraping parameters when referenced.
```

The Actor will load these parameters when processing with `templatePath`.

### Scheduled Updates

On Apify, set up a scheduler:
1. Go to your Actor's "Schedules" tab
2. Create a schedule (e.g., daily)
3. Set `updateExisting: true` to refresh notes instead of creating duplicates
4. Configure `urls` with your regularly-updated sources

### Intelligent Tagging

The Actor includes a curated keyword list:
- Research, Analysis, Data
- Technology, Science, Business
- Education, Health, Finance
- Marketing, Design, Development
- AI, Machine Learning, Cloud, Security
- And more...

Tags are matched case-insensitively against scraped content.

## 🤝 Target Audience

- **Researchers**: Systematically collect and organize research sources
- **Students**: Build learning repositories from course materials and articles
- **Knowledge Workers**: Maintain centralized knowledge bases with automated imports
- **Content Creators**: Track and organize reference materials
- **Digital Marketers**: Monitor and archive competitor content and industry news

## 💡 Use Cases

1. **Research Paper Collection**: Automatically import abstracts and papers into organized folders
2. **News Aggregation**: Daily imports of industry news into time-based folders
3. **Competitive Intelligence**: Monitor competitor websites and archive changes
4. **Learning Repository**: Build study materials from educational sources
5. **Content Curation**: Automatically tag and link curated content by topic

## 📊 Benefits

✅ **Reduces manual data entry** by 90%+  
✅ **Ensures consistent formatting** across all imported content  
✅ **Enhances research productivity** through automated source gathering  
✅ **Improves knowledge discovery** via intelligent linking  
✅ **Maintains up-to-date repositories** without constant manual intervention  
✅ **Scales to bulk operations** with minimal configuration  


## 📄 License

MIT - See LICENSE file for details

## 🤖 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request with detailed description

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review Apify documentation for Actor-specific questions

---

**Made with ❤️ for knowledge workers and researchers**

An Apify Actor that scrapes websites and automatically saves content as markdown notes in your Obsidian vault.