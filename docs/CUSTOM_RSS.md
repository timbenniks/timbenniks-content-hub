# Custom RSS Builder Documentation

The Custom RSS Builder generates RSS feeds for websites that don't provide native RSS/Atom feeds by scraping HTML content and extracting articles.

## Overview

When a website doesn't offer an RSS feed, the system can:
1. Scrape the website's HTML
2. Detect article structure automatically
3. Extract article metadata (title, link, date, content)
4. Generate a valid RSS 2.0 feed

## How It Works

### 1. Article Structure Detection

The system automatically detects article structure by:
- Trying common article selectors (`article`, `.post`, `.entry`, etc.)
- Detecting title, link, date, and content selectors
- Finding article list pages (e.g., `/blog`, `/news`)

**Detection Process**:
```typescript
const structure = await detectArticleStructure(url);
// Returns:
{
  articleSelector: "article",
  titleSelector: "h2",
  linkSelector: "a",
  dateSelector: ".date",
  contentSelector: ".content",
  confidence: "high" | "medium" | "low"
}
```

### 2. RSS Generation

Once structure is detected (or manually configured), the system:
1. Fetches the HTML page
2. Parses HTML with cheerio
3. Extracts articles using selectors
4. Parses dates from various formats
5. Generates RSS 2.0 XML

**Generation Process**:
```typescript
const rssXml = await scrapeAndBuildRSS({
  siteUrl: "https://example.com",
  articleListUrl: "https://example.com/blog",
  articleSelector: "article",
  titleSelector: "h2",
  linkSelector: "a",
  dateSelector: ".date",
  contentSelector: ".content",
  maxItems: 20
});
```

## Configuration

### Manual Configuration

You can manually specify selectors when creating a custom RSS source:

```json
{
  "articleSelector": "article",
  "titleSelector": "h2",
  "linkSelector": "a",
  "dateSelector": ".date",
  "contentSelector": ".content",
  "authorSelector": ".author",
  "articleListUrl": "https://example.com/blog",
  "maxItems": 20
}
```

### Auto-Detection

If no configuration is provided, the system will:
1. Try to detect article structure automatically
2. Fall back to common patterns if detection fails
3. Use sensible defaults for missing selectors

## Date Parsing

The system supports extensive date format parsing:

### Supported Formats

**ISO Dates**:
- `2025-11-24`
- `2025-11-24T10:30:00Z`

**Written Dates**:
- `November 24, 2025`
- `Nov 24, 2025`
- `24 November 2025`
- `24-Nov-2025`

**Numeric Dates**:
- `11/24/2025` (US format)
- `24/11/2025` (EU format)
- `24.11.2025` (EU format with dots)

**Relative Dates**:
- `2 days ago`
- `3 hours ago`
- `yesterday`
- `today`
- `now`

**Date-Time**:
- `November 24, 2025 at 10:30 AM`
- `2025-11-24 10:30:00`

**Unix Timestamps**:
- `1732406400` (seconds)
- `1732406400000` (milliseconds)

### Date Detection Strategies

The system uses multiple strategies to find dates:

1. **Configured Selector**: Uses `dateSelector` if provided
2. **Datetime Attribute**: Checks `<time datetime="">` elements
3. **Class Name Search**: Finds elements with "date", "published", or "time" in class names
4. **Pattern Matching**: Searches for date-like text patterns in any element

## Article Detection

### Common Selectors

The system tries these selectors in order:

**Article Containers**:
- `article`
- `[role='article']`
- `.post`
- `.entry`
- `.article`
- `.blog-post`
- `.news-item`
- `.content-item`
- `.item`
- `li` (for list-based layouts)
- `.card`

**Title Selectors**:
- `h1`, `h2`, `h3`
- `.title`
- `.post-title`
- `.entry-title`
- `.article-title`
- `a` (if contains substantial text)

**Date Selectors**:
- `time`
- `[datetime]`
- `.date`
- `.published`
- `.post-date`
- `.entry-date`
- `.article-date`
- `.timestamp`
- `[class*="date"]` (CSS modules)

**Content Selectors**:
- `.content`
- `.excerpt`
- `.summary`
- `p` (first paragraph)

### Detection Confidence

The system provides confidence levels:
- **High**: Found 5+ articles with consistent structure
- **Medium**: Found 3-4 articles
- **Low**: Found fewer articles or inconsistent structure

## Cloudflare Detection

Before scraping, the system detects Cloudflare protection:

**Indicators**:
- HTTP headers: `cf-ray`, `cf-cache-status`, `server: cloudflare`
- HTML content: Challenge pages, CAPTCHA indicators
- Status codes: 403/503 with Cloudflare headers

**Response**:
```typescript
{
  isProtected: boolean;
  confidence: "low" | "medium" | "high";
  indicators: string[];
  challengeType?: "browser-verification" | "captcha" | "rate-limit";
}
```

If Cloudflare protection is detected, the system shows a warning but still attempts to scrape (may fail).

## RSS Feed Generation

The generated RSS feed follows RSS 2.0 specification:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Site Title</title>
    <link>https://example.com</link>
    <description>Site description</description>
    <language>en</language>
    <lastBuildDate>Mon, 01 Jan 2024 00:00:00 GMT</lastBuildDate>
    <item>
      <title>Article Title</title>
      <link>https://example.com/article</link>
      <description>Article excerpt</description>
      <content:encoded><![CDATA[Article HTML content]]></content:encoded>
      <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
      <guid>https://example.com/article</guid>
      <author>Author Name</author>
    </item>
  </channel>
</rss>
```

## Usage Examples

### Basic Usage

```typescript
import { autoBuildRSS } from "@/lib/rss-builder";

// Auto-detect and build RSS
const rssXml = await autoBuildRSS("https://example.com");
```

### Custom Configuration

```typescript
import { scrapeAndBuildRSS } from "@/lib/rss-builder";

const rssXml = await scrapeAndBuildRSS({
  siteUrl: "https://example.com",
  articleListUrl: "https://example.com/blog",
  articleSelector: ".blog-post",
  titleSelector: "h2 a",
  linkSelector: "h2 a",
  dateSelector: ".post-date",
  contentSelector: ".excerpt",
  maxItems: 50
});
```

### Extract Page Metadata

```typescript
import { extractPageMetadata } from "@/lib/rss-builder";

const { title, description } = await extractPageMetadata("https://example.com");
// Returns: { title: "Example Site", description: "Site description" }
```

## Limitations

1. **JavaScript-Rendered Content**: Cannot scrape content rendered by JavaScript (requires headless browser)
2. **Cloudflare Protection**: May fail on Cloudflare-protected sites
3. **Rate Limiting**: No built-in rate limiting (may hit site limits)
4. **Dynamic Content**: Cannot handle infinite scroll or lazy-loaded content
5. **Authentication**: Cannot access password-protected or authenticated content

## Best Practices

1. **Use Article List Pages**: Point to `/blog` or `/news` instead of homepage
2. **Test Selectors**: Verify selectors work before creating source
3. **Monitor Failures**: Check source status regularly
4. **Respect Robots.txt**: Consider robots.txt rules (not currently enforced)
5. **Rate Limiting**: Don't refresh too frequently

## Troubleshooting

### No Articles Found

- Check if article selector is correct
- Verify article list URL is correct
- Check if site uses JavaScript rendering
- Look for Cloudflare protection

### Dates Not Parsing

- Check date selector
- Verify date format is supported
- Look for datetime attributes
- Check for CSS module class names

### Missing Content

- Verify content selector
- Check if content is in different element
- Look for excerpt vs full content
- Check for JavaScript-rendered content

## Future Improvements

1. **Headless Browser Support**: Use Puppeteer/Playwright for JS-rendered content
2. **Robots.txt Parsing**: Respect robots.txt rules
3. **Rate Limiting**: Implement rate limiting per domain
4. **Caching**: Cache scraped content
5. **Retry Logic**: Retry failed scrapes with exponential backoff
6. **Content Extraction**: Better content extraction (Readability algorithm)

