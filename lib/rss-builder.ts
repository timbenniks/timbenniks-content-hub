/**
 * Custom RSS builder - scrapes HTML and generates RSS feeds
 */

import * as cheerio from "cheerio";
import { normalizeUrl, urlToString } from "./url";
import { detectArticleStructure, detectArticleListUrl } from "./article-detection";
import { generateRSS, RSSFeed, RSSItem } from "./rss-generator";
import { fetchHtml } from "./fetch-utils";
import { parseDate, extractDateFromElement } from "./date-utils";

/**
 * Extract page metadata (title, description) from HTML
 */
export async function extractPageMetadata(url: string): Promise<{
  title: string | null;
  description: string | null;
}> {
  try {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      return { title: null, description: null };
    }

    const urlString = urlToString(normalized);
    const html = await fetchHtml(urlString, { timeout: 10000 });
    const $ = cheerio.load(html);

    // Extract title
    let title: string | null = null;
    const titleTag = $("title").first();
    if (titleTag.length > 0) {
      title = cleanPageTitle(titleTag.text().trim());
    }

    // Extract description from meta tags
    let description: string | null = null;
    const metaDescription = $('meta[name="description"]').attr("content");
    if (metaDescription) {
      description = metaDescription.trim();
    } else {
      // Try Open Graph description
      const ogDescription = $('meta[property="og:description"]').attr("content");
      if (ogDescription) {
        description = ogDescription.trim();
      }
    }

    return { title, description };
  } catch {
    return { title: null, description: null };
  }
}

/**
 * Clean up page title by removing common suffixes
 */
function cleanPageTitle(title: string): string {
  return title.split("|")[0].split("—")[0].split("–")[0].trim();
}

export interface RSSBuilderConfig {
  siteUrl: string;
  articleListUrl?: string; // URL to scrape (defaults to siteUrl)
  articleSelector?: string;
  titleSelector?: string;
  linkSelector?: string;
  dateSelector?: string;
  contentSelector?: string;
  authorSelector?: string;
  maxItems?: number;
}


/**
 * Extract text content from an element, cleaning it up
 */
function extractText($: cheerio.CheerioAPI, element: any): string {
  return $(element).text().trim().replace(/\s+/g, " ");
}

/**
 * Extract HTML content from an element
 */
function extractHtml($: cheerio.CheerioAPI, element: any): string {
  return $(element).html() || "";
}

/**
 * Get absolute URL from relative URL
 */
function getAbsoluteUrl(baseUrl: string, relativeUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).toString();
  } catch {
    return relativeUrl;
  }
}

/**
 * Scrape articles and build RSS feed
 */
export async function scrapeAndBuildRSS(
  config: RSSBuilderConfig
): Promise<string> {
  const {
    siteUrl,
    articleListUrl,
    articleSelector = "article",
    titleSelector = "h1, h2, h3",
    linkSelector = "a",
    dateSelector,
    contentSelector,
    authorSelector,
    maxItems = 20,
  } = config;

  const normalized = normalizeUrl(articleListUrl || siteUrl);
  if (!normalized) {
    throw new Error("Invalid URL");
  }

  const urlString = urlToString(normalized);
  const baseUrl = normalized.origin;

  // Fetch the page
  const html = await fetchHtml(urlString, { timeout: 15000 });
  const $ = cheerio.load(html);

  // Find all articles
  const articleElements = $(articleSelector).slice(0, maxItems);
  const items: RSSItem[] = [];

  for (const articleEl of articleElements.toArray()) {
    const $article = $(articleEl);

    // Extract title
    const titleEl = $article.find(titleSelector).first();
    let title = extractText($, titleEl);
    if (!title) {
      continue; // Skip if no title found
    }

    // Extract link
    const linkEl = $article.find(linkSelector).first();
    let link = linkEl.attr("href") || "";
    if (!link) {
      // Try to find link in title element
      const titleLink = titleEl.closest("a");
      if (titleLink.length > 0) {
        link = titleLink.attr("href") || "";
      }
    }

    if (!link) {
      continue; // Skip if no link found
    }

    link = getAbsoluteUrl(baseUrl, link);

    // Extract date using utility function
    const pubDate = extractDateFromElement($, articleEl, dateSelector) || undefined;

    // Extract description/content
    let description: string | undefined;
    let content: string | undefined;

    if (contentSelector) {
      const contentEl = $article.find(contentSelector).first();
      description = extractText($, contentEl);
      content = extractHtml($, contentEl);
    } else {
      // Fallback: get first paragraph
      const firstP = $article.find("p").first();
      description = extractText($, firstP);
    }

    // Extract author
    let author: string | undefined;
    if (authorSelector) {
      const authorEl = $article.find(authorSelector).first();
      author = extractText($, authorEl);
    }

    // Generate GUID from link
    const guid = link;

    items.push({
      title,
      link,
      description: description || title,
      content,
      pubDate: pubDate || undefined,
      guid,
      author,
    });
  }

  if (items.length === 0) {
    throw new Error("No articles found on the page");
  }

  // Generate RSS feed
  const feed: RSSFeed = {
    title: $("title").text() || new URL(siteUrl).hostname,
    link: siteUrl,
    description: $('meta[name="description"]').attr("content") || undefined,
    language: $("html").attr("lang") || "en",
    lastBuildDate: new Date(),
    items,
  };

  return generateRSS(feed);
}

/**
 * Auto-detect configuration and build RSS
 */
export async function autoBuildRSS(siteUrl: string): Promise<string> {
  // First, try to detect article structure
  const structure = await detectArticleStructure(siteUrl);

  if (!structure) {
    // Try to find article list URL
    const listUrls = await detectArticleListUrl(siteUrl);
    if (listUrls.length === 0) {
      throw new Error("Could not detect article structure");
    }

    // Try first detected URL
    const detectedStructure = await detectArticleStructure(listUrls[0]);
    if (!detectedStructure) {
      throw new Error("Could not detect article structure");
    }

    return scrapeAndBuildRSS({
      siteUrl,
      articleListUrl: listUrls[0],
      ...detectedStructure,
    });
  }

  return scrapeAndBuildRSS({
    siteUrl,
    ...structure,
  });
}

