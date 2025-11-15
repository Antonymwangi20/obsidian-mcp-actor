# Scheduled Scraping Guide

This guide explains how to set up recurring scraping jobs to automatically keep your Obsidian vault content fresh and up-to-date.

## 🕐 Overview

Scheduled scraping allows you to:
- **Automatically refresh** content from dynamic sources
- **Update existing notes** instead of creating duplicates
- **Run on a schedule** (hourly, daily, weekly, monthly)
- **Monitor changes** to important websites
- **Maintain current** research repositories

## 🔧 Setup Methods

### Method 1: Apify Console (Easiest)

The Apify platform provides a built-in scheduler for recurring tasks.

#### Step 1: Open Your Actor in Apify Console

1. Go to [apify.com](https://apify.com)
2. Log in to your account
3. Navigate to your "Obsidian MCP Actor" in the Actor library
4. Click "Runs" → "View all runs"

#### Step 2: Create a Schedule

1. Click the **"Schedules"** tab on the left sidebar
2. Click **"Create a schedule"** button
3. Fill in the schedule configuration:

| Field | Value | Example |
|-------|-------|---------|
| Schedule name | Descriptive name | "Daily News Update" |
| Cron expression | Unix cron format | `0 9 * * *` (9 AM daily) |
| Timeout | Maximum run duration | `300` (5 minutes) |
| Memory | MB for Actor | `256` |
| Enabled | Toggle on/off | ✓ Enabled |

#### Step 3: Configure Input

1. In the "Input" section, add your JSON configuration:

**Example: Update existing notes daily**

```json
{
  "urls": [
    "https://news.ycombinator.com",
    "https://www.reddit.com/r/MachineLearning/",
    "https://www.theverge.com/tech"
  ],
  "vaultPath": "/Users/username/Documents/Obsidian/MyVault",
  "folderPath": "daily-news",
  "bulkMode": true,
  "updateExisting": true,
  "rateLimitDelay": 2000,
  "autoTag": true,
  "autoLink": false
}
```

#### Step 4: Save Schedule

1. Click **"Save schedule"**
2. Apify will confirm the schedule is active
3. Your Actor will now run automatically on the set schedule

### Method 2: Apify API

For programmatic schedule creation or integration with external tools:

#### Create Schedule via API

```bash
curl https://api.apify.com/v2/actor-tasks \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "actId": "YOUR_ACTOR_ID",
    "taskId": "daily-update",
    "options": {
      "isWebhookEnabled": true,
      "webhookUrls": ["https://your-webhook.example.com"]
    },
    "input": {
      "urls": ["https://example.com/article"],
      "vaultPath": "/path/to/vault",
      "updateExisting": true
    }
  }'
```

#### Get API Token

1. Go to [apify.com/account/integrations](https://apify.com/account/integrations)
2. In "API tokens" section, click **"Create token"**
3. Select scopes: `actor:run`, `datasets:read`, `task:read`, `schedule:create`
4. Copy the token and keep it secure

### Method 3: GitHub Actions (CI/CD Integration)

Set up scheduled runs triggered by GitHub itself:

#### Create GitHub Workflow

Create `.github/workflows/scheduled-scrape.yml`:

```yaml
name: Scheduled Scraping

on:
  schedule:
    # Every day at 9 AM UTC
    - cron: '0 9 * * *'
  workflow_dispatch:  # Allow manual trigger

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run scheduled scrape
        env:
          VAULT_PATH: ${{ secrets.VAULT_PATH }}
          APIFY_TOKEN: ${{ secrets.APIFY_TOKEN }}
        run: |
          node main.js --urls "https://example.com" \
                        --vaultPath "$VAULT_PATH" \
                        --bulkMode true \
                        --updateExisting true
      
      - name: Commit and push changes
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add storage/
          git diff --quiet && git diff --staged --quiet || \
            (git commit -m "Scheduled scrape: $(date)" && git push)
```

**Setup secrets:**

1. Go to GitHub repo → Settings → Secrets → "New repository secret"
2. Add:
   - `VAULT_PATH`: Your vault absolute path
   - `APIFY_TOKEN`: Your Apify API token
3. Workflow will run on schedule automatically

## 📅 Cron Expression Reference

Use cron format `"minute hour day month weekday"` for scheduling:

| Expression | Meaning | Example |
|------------|---------|---------|
| `0 9 * * *` | Daily at 9 AM | News update every morning |
| `0 */4 * * *` | Every 4 hours | Continuous monitoring |
| `0 0 * * 0` | Weekly (Sunday) | Weekly summary |
| `0 0 1 * *` | Monthly (1st) | Monthly archive |
| `*/15 * * * *` | Every 15 minutes | Real-time tracking |

**Online Cron Builder:** [crontab.guru](https://crontab.guru)

## 🎯 Common Scheduling Patterns

### Pattern 1: Daily News Digest

**Schedule:** `0 8 * * *` (8 AM every day)

**Input:**
```json
{
  "urls": [
    "https://news.ycombinator.com",
    "https://www.producthunt.com",
    "https://techcrunch.com"
  ],
  "vaultPath": "/path/to/vault",
  "folderPath": "daily-news",
  "bulkMode": true,
  "updateExisting": true,
  "rateLimitDelay": 2000,
  "autoTag": true
}
```

### Pattern 2: Continuous Content Monitoring

**Schedule:** `0 */2 * * *` (Every 2 hours)

**Input:**
```json
{
  "urls": [
    "https://blog.company.com",
    "https://github.com/trending"
  ],
  "vaultPath": "/path/to/vault",
  "folderPath": "monitoring",
  "bulkMode": true,
  "updateExisting": true,
  "rateLimitDelay": 3000,
  "autoTag": true,
  "autoLink": true
}
```

### Pattern 3: Weekly Research Roundup

**Schedule:** `0 6 * * 1` (Monday 6 AM)

**Input:**
```json
{
  "urls": [
    "https://arxiv.org/list/cs.AI/recent",
    "https://scholar.google.com/scholar?q=machine+learning",
    "https://medium.com/tag/research"
  ],
  "vaultPath": "/path/to/vault",
  "folderPath": "research/weekly",
  "bulkMode": true,
  "updateExisting": false,
  "rateLimitDelay": 5000,
  "autoTag": true,
  "autoLink": true
}
```

### Pattern 4: Quarterly Archive

**Schedule:** `0 0 1 1,4,7,10 *` (1st of every 3 months at midnight)

**Input:**
```json
{
  "urls": ["https://industry-report.example.com"],
  "vaultPath": "/path/to/vault",
  "folderPath": "archives/quarterly",
  "updateExisting": false,
  "autoTag": true,
  "autoLink": false
}
```

## 🔄 Update vs. Create Strategy

### Using `updateExisting: true`

When enabled, the Actor will:
1. Check if a note with the same name already exists
2. **Replace** the note content with fresh data
3. **Preserve** the YAML front-matter structure
4. **Update** the `scraped` timestamp

**Use when:**
- Monitoring dynamic content (news, stock prices)
- Refreshing research notes periodically
- Keeping single sources of truth updated

### Using `updateExisting: false`

When disabled, the Actor will:
1. Check if a note already exists
2. **Create a new file** with timestamp appended (e.g., `article_2025-01-15.md`)
3. **Preserve** the original note
4. **Keep history** of content changes

**Use when:**
- Tracking content evolution over time
- Creating versions for comparison
- Building audit trails
- Archiving historical snapshots

## 📊 Performance Optimization

### For Large Bulk Operations

If scheduling many URLs, optimize performance:

```json
{
  "urls": ["url1", "url2", ..., "url100"],
  "bulkMode": true,
  "rateLimitDelay": 2000,
  "downloadImages": false,
  "autoLink": false
}
```

**Optimization Tips:**
- Set `rateLimitDelay` to 2000-5000 ms (respect target servers)
- Disable `downloadImages` for faster runs
- Disable `autoLink` if not needed (expensive operation)
- Split into multiple schedules if > 20 URLs

### Memory and Timeout Settings

In Apify Console:
- **Small runs (1-5 URLs):** 256 MB memory, 60s timeout
- **Medium runs (5-20 URLs):** 512 MB memory, 300s timeout
- **Large runs (20+ URLs):** 1024 MB memory, 600s timeout

## 🔔 Notifications & Monitoring

### Webhook Notifications

Get notified when scheduled runs complete:

```bash
curl https://api.apify.com/v2/actor-tasks \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -X POST \
  -d '{
    "webhookUrls": ["https://your-webhook.com/apify"],
    "options": {
      "isWebhookEnabled": true,
      "shouldNotifyBeforeTimeout": true
    }
  }'
```

### Email Alerts (Optional)

Apify can send email reports:
1. Schedule → Settings → "Email on completion"
2. Optionally attach run logs

### Discord Integration

Post to Discord when runs complete:

```json
{
  "webhookUrls": ["https://discord.com/api/webhooks/YOUR_WEBHOOK"]
}
```

## ⚠️ Best Practices

### Dos ✓

- ✓ Start with infrequent schedules (daily) before ramping up
- ✓ Set reasonable rate limits to respect target websites
- ✓ Monitor the first few runs to verify behavior
- ✓ Use `updateExisting: true` to avoid duplicates
- ✓ Add meaningful folder names for organization
- ✓ Keep URLs in a separate configuration file for easier updates
- ✓ Test locally with `npm test` before scheduling

### Don'ts ✗

- ✗ Don't schedule more than once per hour without reason
- ✗ Don't ignore robots.txt or website terms of service
- ✗ Don't schedule scrapers for sites with login requirements
- ✗ Don't enable `autoLink` for every run (expensive)
- ✗ Don't download images unnecessarily (increases storage)
- ✗ Don't use very short rate limits (< 1000ms)
- ✗ Don't schedule runs during peak traffic times without permission

## 🐛 Troubleshooting Schedules

### Schedule Not Running

**Problem:** Scheduled job doesn't execute

**Solutions:**
1. Verify schedule is "Enabled" in Apify Console
2. Check that cron expression is correct (use [crontab.guru](https://crontab.guru))
3. Ensure Actor has sufficient memory allocated
4. Check Actor hasn't hit usage limits

### Run Times Out

**Problem:** Actor exceeds timeout during scheduled run

**Solutions:**
1. Increase timeout in schedule settings
2. Reduce number of URLs in batch
3. Increase `rateLimitDelay` if Target server is slow
4. Disable image downloading

### Vault File Conflicts

**Problem:** Multiple jobs try to write same file

**Solutions:**
1. Use different `folderPath` for different schedules
2. Enable `updateExisting: true` to prevent duplicates
3. Use timestamp-based file naming strategy
4. Stagger schedule times to avoid overlap

### Memory Issues

**Problem:** "Out of memory" errors

**Solutions:**
1. Increase memory allocation in schedule settings (256 → 512 → 1024 MB)
2. Reduce batch size (process 5 URLs per schedule instead of 50)
3. Disable `autoLink` (memory-intensive)
4. Create multiple smaller schedules instead of one large

## 📈 Scaling to Production

### Step 1: Start Small

Test with 1-2 URLs on a daily schedule

### Step 2: Monitor First Run

Check Apify Console → Runs:
- Verify success/failure
- Review performance metrics
- Check vault for correctly formatted notes

### Step 3: Expand Gradually

Increase to 5-10 URLs, then 20+

### Step 4: Add Notifications

Set up webhook or email alerts

### Step 5: Production Rollout

Deploy with full configuration:
- Optimized rate limiting
- Error notifications
- Performance monitoring
- Backup strategy

## 📚 Related Documentation

- [README.md](./README.md) - Main Actor documentation
- [INPUT_SCHEMA.json](./INPUT_SCHEMA.json) - Full configuration options
- [MCP_SERVER.md](./MCP_SERVER.md) - MCP integration guide
- [Apify Scheduler Docs](https://docs.apify.com/platform/schedules) - Official Apify docs

## 💡 Advanced Examples

### Example: Monitoring Competitor Updates

**Schedule:** Every 4 hours (`0 */4 * * *`)

```json
{
  "urls": [
    "https://competitor1.com/blog",
    "https://competitor2.com/news",
    "https://competitor3.com/updates"
  ],
  "vaultPath": "/path/to/vault",
  "folderPath": "competitive-intel",
  "bulkMode": true,
  "updateExisting": false,
  "rateLimitDelay": 3000,
  "autoTag": true,
  "tags": ["competitor-tracking"]
}
```

### Example: Research Paper Aggregation

**Schedule:** Daily at 6 AM (`0 6 * * *`)

```json
{
  "urls": [
    "https://arxiv.org/list/cs.AI/recent",
    "https://arxiv.org/list/cs.CL/recent"
  ],
  "vaultPath": "/path/to/vault",
  "folderPath": "research/papers",
  "bulkMode": true,
  "updateExisting": false,
  "rateLimitDelay": 4000,
  "autoTag": true,
  "autoLink": true,
  "tags": ["arxiv", "research"]
}
```

---

**Pro Tip:** Start with daily schedules and expand gradually. Monitor the first 5-10 runs to ensure everything works correctly before scaling up!
