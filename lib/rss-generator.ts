/**
 * RSS 2.0 feed generation utilities
 */

export interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: Date;
  guid?: string;
  author?: string;
  content?: string;
}

export interface RSSFeed {
  title: string;
  link: string;
  description?: string;
  language?: string;
  lastBuildDate?: Date;
  items: RSSItem[];
}

/**
 * Format date for RSS (RFC 822)
 */
function formatRSSDate(date: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const day = days[date.getUTCDay()];
  const month = months[date.getUTCMonth()];
  const dayNum = date.getUTCDate();
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const seconds = date.getUTCSeconds().toString().padStart(2, "0");

  return `${day}, ${dayNum} ${month} ${year} ${hours}:${minutes}:${seconds} +0000`;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generate RSS 2.0 XML feed
 */
export function generateRSS(feed: RSSFeed): string {
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">');
  lines.push("  <channel>");

  // Channel metadata
  lines.push(`    <title>${escapeXml(feed.title)}</title>`);
  lines.push(`    <link>${escapeXml(feed.link)}</link>`);
  if (feed.description) {
    lines.push(`    <description>${escapeXml(feed.description)}</description>`);
  }
  if (feed.language) {
    lines.push(`    <language>${escapeXml(feed.language)}</language>`);
  }
  if (feed.lastBuildDate) {
    lines.push(`    <lastBuildDate>${formatRSSDate(feed.lastBuildDate)}</lastBuildDate>`);
  }
  lines.push(`    <generator>Custom RSS Builder</generator>`);

  // Items
  for (const item of feed.items) {
    lines.push("    <item>");
    lines.push(`      <title>${escapeXml(item.title)}</title>`);
    lines.push(`      <link>${escapeXml(item.link)}</link>`);
    
    if (item.guid) {
      lines.push(`      <guid isPermaLink="false">${escapeXml(item.guid)}</guid>`);
    } else {
      lines.push(`      <guid isPermaLink="true">${escapeXml(item.link)}</guid>`);
    }

    if (item.pubDate) {
      lines.push(`      <pubDate>${formatRSSDate(item.pubDate)}</pubDate>`);
    }

    if (item.author) {
      lines.push(`      <author>${escapeXml(item.author)}</author>`);
    }

    if (item.description) {
      lines.push(`      <description>${escapeXml(item.description)}</description>`);
    }

    if (item.content) {
      lines.push(`      <content:encoded><![CDATA[${item.content}]]></content:encoded>`);
    }

    lines.push("    </item>");
  }

  lines.push("  </channel>");
  lines.push("</rss>");

  return lines.join("\n");
}

