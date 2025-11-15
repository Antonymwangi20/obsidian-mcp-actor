---
folderPath: "research/news"
autoTag: true
autoLink: true
---

# News Scraper Template

This template defines the scraping configuration for news articles.
When referenced via `templatePath: "templates/news-scraper"`, the Actor will:
- Save notes to the "research/news" folder
- Automatically extract and apply tags
- Create bidirectional links between related articles

## Usage

Include this template in your Actor input:

```json
{
  "url": "https://news.example.com/article",
  "vaultPath": "/path/to/vault",
  "templatePath": "templates/news-scraper"
}
```
