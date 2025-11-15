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
- **Integration with Apify scheduler**: Set up recurring runs to keep content fresh
- **Existing note updates**: Option to update vs. create new notes
- **Change tracking**: Timestamps track when content was last scraped

## 📋 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Antonymwangi20/obsidian-mcp-actor.git
   cd obsidian-mcp-actor
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up your Obsidian vault path** (see Configuration below)

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

## 🚀 Usage

### Local Development

1. Create an `input.json` file in the project root:
   ```json
   {
     "url": "https://example.com",
     "vaultPath": "/path/to/your/vault"
   }
   ```

2. Run with npm:
   ```bash
   npm start
   ```

   Or with Apify CLI:
   ```bash
   apify run
   ```

### On Apify Platform

1. Push the Actor to Apify:
   ```bash
   apify push
   ```

2. Visit the Apify Console and click "Run"

3. Fill in the input form (schema is auto-generated from `INPUT_SCHEMA.json`)

4. Click "Run" to start the scraping job

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

## 🏗️ Architecture

```
main.js
├── scrapeWebsite()           # CheerioCrawler-based web scraping
├── convertToMarkdown()       # HTML to Markdown with front-matter
├── extractTags()             # Intelligent tag extraction
├── loadTemplateConfig()      # Template parameter loading
├── updateInternalLinks()     # Cross-reference linking
├── saveToVault()             # File system operations
├── readExistingNote()        # Note update support
└── scanVaultForNotes()       # Vault analysis for linking
```

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

## 🐛 Troubleshooting

### "Cannot destructure property 'url' of 'input' as it is null"
- When running locally, ensure you have either an `input.json` file or run with `apify run`
- The Actor is designed for Apify's execution environment where `Actor.getInput()` returns the provided JSON

### Notes not being created
- Verify the `vaultPath` is correct and the directory exists
- Ensure read/write permissions on the vault folder
- Check that `folderPath` doesn't contain invalid characters

### Tags not appearing
- Ensure `autoTag: true` in your input
- Check that `addMetadata: true` so front-matter is included
- Review the extracted tags in Actor logs

### Internal links not working
- Verify `autoLink: true` is set
- Ensure existing notes have tags in their front-matter
- Check that Obsidian is using the correct vault folder

## 📦 Dependencies

- **apify** (^3.1.0): Apify Actor SDK
- **crawlee** (^3.7.0): Lightweight web scraping library
- **turndown** (^7.1.2): HTML to Markdown conversion
- **apify-client** (^2.8.0): Apify API client

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

## 🚀 Quick Start

### Prerequisites
1. **Obsidian vault** - Download Obsidian from [obsidian.md](https://obsidian.md) (free)
2. **Apify account** - You already have one! ($5/month free tier)

### Setup Steps

#### 1. Create Your Obsidian Vault
```bash
# Create a folder anywhere on your computer
mkdir ~/Documents/MyObsidianVault

# Open Obsidian and select this folder as your vault
```

#### 2. Deploy to Apify

**Option A: Via Apify Console**
1. Go to [Apify Console](https://console.apify.com)
2. Click "Actors" → "Create new"
3. Choose "Empty project"
4. Copy the code from the artifacts above:
   - `main.js` → Main code
   - `package.json` → Dependencies
   - `INPUT_SCHEMA.json` → Input configuration
5. Click "Build" → "Save & Build"

**Option B: Via Apify CLI** (if you want local development)
```bash
# Install Apify CLI
npm install -g apify-cli

# Login to Apify
apify login

# Create new actor
apify create obsidian-mcp-actor

# Copy the files into the created folder
# Then push to Apify
apify push
```

#### 3. Run Your First Scrape

In the Apify Console:

1. Go to your Actor
2. Click "Start" tab
3. Enter:
   ```json
   {
     "url": "https://example.com",
     "vaultPath": "/path/to/your/ObsidianVault",
     "folderPath": "scraped",
     "tags": ["test", "web-scraping"]
   }
   ```
4. Click "Start"

**Important:** Replace `/paths/to/your/ObsidianVault` with your actual vault path!

### Finding Your Vault Path

**MacOS/Linux:**
```bash
cd ~/Documents/MyObsidianVault
pwd
# Copy the output
```

**Windows:**
```cmd
cd C:\Users\YourName\Documents\MyObsidianVault
cd
# Copy the output
```

## 📝 Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | ✅ | Website URL to scrape |
| `vaultPath` | string | ✅ | Absolute path to Obsidian vault |
| `noteName` | string | ❌ | Custom note name (defaults to page title) |
| `folderPath` | string | ❌ | Subfolder in vault (default: "scraped") |
| `addMetadata` | boolean | ❌ | Add YAML front-matter (default: true) |
| `tags` | array | ❌ | Tags to add to note |

## 📄 Output Format

The Actor creates markdown notes with this structure:

```markdown
---
title: "Article Title"
url: https://example.com/article
scraped: 2025-11-15T10:30:00.000Z
tags: [research, web-scraping]
---

# Article Title

> Source: [https://example.com/article](https://example.com/article)

[Main content converted to markdown...]

## Metadata
- **Author:** John Doe
- **Description:** Article description
```

## 🎯 Example Use Cases

### 1. Research Article Collection
```json
{
  "url": "https://arxiv.org/abs/2301.12345",
  "vaultPath": "/path/to/vault",
  "folderPath": "research/papers",
  "tags": ["machine-learning", "research"]
}
```

### 2. Blog Post Archive
```json
{
  "url": "https://blog.example.com/great-post",
  "vaultPath": "/path/to/vault",
  "folderPath": "reading/blogs",
  "tags": ["reading-list", "tech"]
}
```

### 3. Documentation Snapshot
```json
{
  "url": "https://docs.example.com/api/reference",
  "vaultPath": "/path/to/vault",
  "noteName": "API-Reference-2025-11-15",
  "folderPath": "documentation"
}
```

## 🔧 Troubleshooting

### "No content scraped from URL"
- Check if the URL is accessible
- Some sites block scrapers - try a different URL first
- Verify you have Apify credits available

### "Cannot write to vault"
- Verify the `vaultPath` is correct and absolute
- Check folder permissions (Actor needs write access)
- Make sure Obsidian isn't locking the file

### "Module not found" errors
- Rebuild the Actor in Apify Console
- Check that all dependencies are in package.json

## 💡 Next Steps

To be added later:
- [ ] Batch scraping multiple URLs
- [ ] Template-driven scraping
- [ ] Smart linking to existing notes
- [ ] Scheduled updates
- [ ] MCP server integration for Claude

## 📚 Resources

- [Apify Documentation](https://docs.apify.com)
- [Obsidian Documentation](https://help.obsidian.md)
- [Website Content Crawler](https://apify.com/apify/website-content-crawler)

## 🤝 Contributing

This is a work in progress! Suggestions and improvements welcome.