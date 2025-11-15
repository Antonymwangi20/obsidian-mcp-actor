# MCP Server Integration

This Actor includes an **MCP (Model Context Protocol) Server** that exposes web scraping and content processing capabilities to Claude and other LLM applications. This enables AI-powered workflows for intelligent content extraction and organization.

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- `@modelcontextprotocol/sdk` dependency (already included)

### Starting the MCP Server

```bash
npm run mcp-server
```

The server will start and listen on stdin/stdout for MCP protocol messages.

## 📋 Available Tools

The MCP Server exposes **5 powerful tools** for AI integration:

### 1. **scrape_website**
Fetch and parse content from a URL with retry logic.

**Arguments:**
- `url` (string, required): Website URL to scrape
- `retries` (integer, optional, default=3): Number of retry attempts with exponential backoff

**Returns:**
```json
{
  "success": true,
  "title": "Page Title",
  "description": "Meta description",
  "author": "Content author if available",
  "contentLength": 45230,
  "textPreview": "First 500 characters of extracted text..."
}
```

**Use Cases:**
- AI research and fact-checking
- Content validation before bulk import
- Single-URL preview before committing to vault

### 2. **extract_tags**
Intelligently extract tags from content using frequency analysis.

**Arguments:**
- `url` (string, required): Source URL
- `title` (string, required): Content title
- `description` (string, required): Content description
- `text` (string, required): Full extracted text

**Returns:**
```json
{
  "success": true,
  "tags": [
    "research",
    "artificial-intelligence",
    "machine-learning",
    "github.com",
    "technology"
  ]
}
```

**Algorithm:**
- Frequency-based keyword matching against curated keyword list
- Domain-based tagging (extracts domain from URL)
- Top 5 keywords + domain tag returned
- Case-insensitive matching

**Use Cases:**
- AI-powered tag assignment for categorization
- Consistency across bulk imports
- Automated taxonomy building

### 3. **validate_content**
Ensure scraped content meets quality standards.

**Arguments:**
- `url` (string, required): Source URL
- `title` (string, required): Content title
- `html` (string, required): Raw HTML content
- `text` (string, required): Extracted text

**Returns:**
```json
{
  "valid": true,
  "issues": []
}
```

OR (if invalid):

```json
{
  "valid": false,
  "issues": [
    "Content is too short (< 100 characters)",
    "Title is missing or empty",
    "Access restricted by login requirement"
  ]
}
```

**Validation Checks:**
- ✓ Title presence
- ✓ Minimum content length (100+ characters)
- ✓ Access restriction detection (login walls, paywalls)
- ✓ Null/undefined checks

**Use Cases:**
- Quality gates for automated imports
- AI decision-making on content usability
- Filtering low-quality sources

### 4. **convert_html_to_markdown**
Transform HTML to clean Markdown format.

**Arguments:**
- `html` (string, required): Raw HTML content

**Returns:**
```json
{
  "success": true,
  "markdown": "# Heading\n\nParagraph text...",
  "success": true
}
```

**Features:**
- Preserves document structure (headings, lists, emphasis)
- Converts links and images to Markdown syntax
- Removes styling and scripts
- Handles nested elements correctly

**Use Cases:**
- Pre-processing HTML before vault import
- Email newsletters to Markdown conversion
- Web clipper augmentation

### 5. **save_note**
Persist content directly to Obsidian vault as a Markdown file.

**Arguments:**
- `vaultPath` (string, required): Absolute path to Obsidian vault
- `folderPath` (string, required): Subfolder path within vault
- `fileName` (string, required): Note file name (without .md extension)
- `content` (string, required): Markdown content with YAML front-matter

**Returns:**
```json
{
  "success": true,
  "path": "/Users/username/Documents/MyVault/research/my-article.md",
  "message": "Note saved successfully"
}
```

OR (if error):

```json
{
  "success": false,
  "error": "Vault directory does not exist",
  "message": "Failed to save note"
}
```

**Safety Features:**
- Creates directories if missing
- Sanitizes file names
- Validates vault path accessibility
- Handles special characters in file names

**Use Cases:**
- AI-powered vault management
- Automated research repository building
- One-shot note creation via Claude

## 🔌 Integration with Claude

### Using with Claude Desktop

1. Add MCP server to Claude Desktop configuration (`~/.claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "obsidian-actor": {
      "command": "node",
      "args": ["/path/to/obsidian-mcp-actor/mcp-server.js"]
    }
  }
}
```

2. Restart Claude Desktop

3. MCP tools now available in Claude conversations:
   - Type `@obsidian-actor` to see available tools
   - Claude can automatically call these tools

### Example Claude Conversation

**User:**
> "Research the latest developments in quantum computing and create a note in my vault with auto-generated tags."

**Claude Process:**
1. Calls `scrape_website` to fetch content
2. Calls `validate_content` to ensure quality
3. Calls `extract_tags` to generate tags
4. Calls `convert_html_to_markdown` to format
5. Calls `save_note` to persist to vault

**Result:** Research note automatically added to vault with proper formatting and tags!

## 🔄 Workflow Examples

### Example 1: Research Pipeline

```
Claude receives research query
  ↓
Claude calls scrape_website(url)
  ↓
Claude calls validate_content() for quality check
  ↓
Claude calls extract_tags() for categorization
  ↓
Claude calls convert_html_to_markdown()
  ↓
Claude calls save_note() to vault
  ↓
Note ready in Obsidian with metadata!
```

### Example 2: Content Curation

```
Claude receives content curator prompt
  ↓
Claude scrapes 5 URLs in sequence
  ↓
For each URL:
  - Validate content quality
  - Extract relevant tags
  - Generate custom front-matter
  - Save to appropriate vault folder
  ↓
Curated collection ready for review
```

### Example 3: Bulk Import with Validation

```
Claude receives list of URLs
  ↓
For each URL:
  1. scrape_website()
  2. validate_content() - skip if invalid
  3. extract_tags()
  4. convert_html_to_markdown()
  5. save_note()
  ↓
Progress summary with success/failure counts
```

## 📊 Tool Usage Statistics

| Tool | Primary Use | Typical Response Time |
|------|------------|----------------------|
| scrape_website | Content extraction | 2-5 seconds |
| extract_tags | Auto-tagging | < 100ms |
| validate_content | Quality gates | < 50ms |
| convert_html_to_markdown | Format conversion | < 200ms |
| save_note | Vault persistence | < 100ms |

## 🔒 Security Considerations

### File System Access
- MCP server only accesses Obsidian vault path
- Validates all file paths to prevent directory traversal
- Respects file system permissions

### Network Access
- Only makes requests to URLs explicitly provided
- Uses standard HTTP/HTTPS protocols
- Respects robots.txt and website ToS
- Implements rate limiting in Actor mode

### Data Handling
- No telemetry or external logging
- No credentials stored or transmitted
- Content processed locally only
- YAML front-matter sanitized for security

## 🛠️ Troubleshooting

### "Tool not found" Error
- Ensure MCP server is running: `npm run mcp-server`
- Verify Claude/LLM is properly configured to use MCP
- Check Claude Desktop config points to correct script path

### "Vault path not accessible" Error
- Verify vault path is absolute (not relative)
- Check folder permissions are readable
- Ensure vault exists before calling save_note

### Scraping Failures
- Check URL is accessible in your network
- Some websites block automated requests (robots.txt)
- Add retries parameter: `"retries": 5` for unstable connections
- Check network connectivity and proxy settings

### Rate Limiting Issues
- MCP server has per-request timeouts (5s default)
- Use Actor mode for bulk operations requiring rate limiting
- Set `rateLimitDelay` in Actor input for multi-URL batches

## 🚀 Advanced Usage

### Custom Tool Chaining

Claude can orchestrate complex workflows:

```javascript
// Pseudo-code of what Claude does internally
const { title, description } = await scrapeWebsite(url);
const validation = await validateContent(url, title, html, text);

if (!validation.valid) {
  return "Content not suitable for vault";
}

const tags = await extractTags(url, title, description, text);
const markdown = await convertHtmlToMarkdown(html);
const front_matter = `---\ntitle: ${title}\ntags: [${tags.join(', ')}]\n---`;
const content = front_matter + "\n\n" + markdown;

await saveNote(vaultPath, folderPath, fileName, content);
```

### Error Recovery

MCP tools include built-in retry logic:
- `scrape_website`: 3 retries with exponential backoff (1s, 2s, 3s)
- Other tools: Fail fast with clear error messages
- Claude can implement custom retry logic in conversations

## 📚 Related Documentation

- [README.md](./README.md) - Main Actor documentation
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Upgrade guide
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) - MCP SDK docs
- [Obsidian API](https://docs.obsidian.md/) - Vault format details

## 🎯 Future Enhancements

Potential improvements for future versions:
- [ ] Streaming tool output for large content
- [ ] Webhook notifications for completed tasks
- [ ] LLM-based content summarization
- [ ] Vector database integration for semantic search
- [ ] Custom front-matter template support
- [ ] Batch operation tracking and callbacks

## 📞 Support

For MCP server issues:
1. Check this documentation
2. Verify Node.js version (18.x+)
3. Review error messages in terminal
4. Check GitHub issues
5. Open a new issue with:
   - MCP SDK version
   - Node version
   - OS and architecture
   - Detailed error logs
   - Minimal reproduction case

---

**Happy scraping with AI-powered automation!**
