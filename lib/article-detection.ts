/**
 * Article structure detection for custom RSS building
 */

import * as cheerio from "cheerio";
import { normalizeUrl, urlToString } from "./url";
import { fetchHtml } from "./fetch-utils";
import { extractDateFromElement } from "./date-utils";

export interface ArticleStructure {
  articleSelector: string;
  titleSelector: string;
  linkSelector: string;
  dateSelector?: string;
  contentSelector?: string;
  authorSelector?: string;
  confidence: "low" | "medium" | "high";
}

/**
 * Common article container selectors (in order of preference)
 */
const ARTICLE_SELECTORS = [
  "article",
  "[role='article']",
  ".post",
  ".entry",
  ".article",
  ".blog-post",
  ".news-item",
  ".content-item",
  ".item",
  "li",
  ".card",
];

/**
 * Common title selectors
 */
const TITLE_SELECTORS = [
  "h1",
  "h2",
  "h3",
  ".title",
  ".post-title",
  ".entry-title",
  ".article-title",
  "a",
];

/**
 * Common date patterns
 */
const DATE_SELECTORS = [
  "time",
  "[datetime]",
  ".date",
  ".published",
  ".post-date",
  ".entry-date",
  ".article-date",
  ".timestamp",
];

/**
 * Detect article structure from a URL
 */
export async function detectArticleStructure(
  url: string
): Promise<ArticleStructure | null> {
  try {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      return null;
    }

    const urlString = urlToString(normalized);
    const html = await fetchHtml(urlString, { timeout: 10000 });
    const $ = cheerio.load(html);

    // Try to find article containers
    let articleSelector: string | null = null;
    let confidence: "low" | "medium" | "high" = "low";

    for (const selector of ARTICLE_SELECTORS) {
      const elements = $(selector);
      if (elements.length >= 3) {
        // Found multiple articles, likely correct
        articleSelector = selector;
        confidence = elements.length >= 5 ? "high" : "medium";
        break;
      }
    }

    // Fallback: look for list items with links
    if (!articleSelector) {
      const listItems = $("li").filter((_, el) => {
        return $(el).find("a").length > 0;
      });
      if (listItems.length >= 3) {
        articleSelector = "li";
        confidence = listItems.length >= 5 ? "medium" : "low";
      }
    }

    if (!articleSelector) {
      return null;
    }

    // Detect title selector within articles
    const sampleArticle = $(articleSelector).first();
    let titleSelector = "h1, h2, h3";
    let linkSelector = "a";

    // Check if title is in a link
    const titleLink = sampleArticle.find("a").first();
    if (titleLink.length > 0) {
      const linkText = titleLink.text().trim();
      if (linkText.length > 10) {
        // Link contains substantial text, likely the title
        linkSelector = "a";
        titleSelector = "a";
      }
    }

    // Detect date selector - try exact selectors first
    let dateSelector: string | undefined;
    for (const selector of DATE_SELECTORS) {
      if (sampleArticle.find(selector).length > 0) {
        dateSelector = selector;
        break;
      }
    }
    
    // If not found, try to detect from class attributes
    if (!dateSelector) {
      const elementsWithDate = sampleArticle.find('[class*="date"], [class*="Date"], [class*="published"], [class*="Published"], [class*="time"], [class*="Time"]');
      if (elementsWithDate.length > 0) {
        const firstElement = elementsWithDate.first();
        const className = firstElement.attr('class');
        if (className) {
          const classes = className.split(/\s+/);
          const dateClass = classes.find(cls => 
            cls.toLowerCase().includes('date') || 
            cls.toLowerCase().includes('published') ||
            cls.toLowerCase().includes('time')
          );
          if (dateClass) {
            dateSelector = `.${dateClass}`;
          }
        }
      }
    }
    
    // Fallback: try to find date by testing extraction
    if (!dateSelector) {
      const testDate = extractDateFromElement($, sampleArticle.get(0));
      if (testDate) {
        // Found a date, try to identify the selector
        const allElements = sampleArticle.find('*');
        for (const el of allElements.toArray()) {
          const testElDate = extractDateFromElement($, el);
          if (testElDate) {
            const tagName = el.tagName?.toLowerCase();
            if (tagName) {
              dateSelector = tagName;
              break;
            }
          }
        }
      }
    }

    // Detect content selector
    const contentSelectors = [".content", ".excerpt", ".summary", "p"];
    let contentSelector: string | undefined;
    for (const selector of contentSelectors) {
      if (sampleArticle.find(selector).length > 0) {
        contentSelector = selector;
        break;
      }
    }

    return {
      articleSelector,
      titleSelector,
      linkSelector,
      dateSelector,
      contentSelector,
      confidence,
    };
  } catch {
    return null;
  }
}

/**
 * Detect common article list URLs (blog, news, posts, etc.)
 */
export async function detectArticleListUrl(
  baseUrl: string
): Promise<string[]> {
  const commonPaths = [
    "/blog",
    "/posts",
    "/news",
    "/articles",
    "/updates",
    "/feed",
    "/archive",
    "/",
  ];

  const detectedUrls: string[] = [];

  for (const path of commonPaths) {
    try {
      const url = new URL(path, baseUrl);
      const normalized = normalizeUrl(url.toString());
      if (!normalized) continue;

      const urlString = urlToString(normalized);
      const html = await fetchHtml(urlString, { timeout: 5000 });
      const $ = cheerio.load(html);

      // Check if page has article-like content
      const articleCount =
        $("article").length +
        $(".post").length +
        $(".entry").length +
        $("li").filter((_, el) => $(el).find("a").length > 0).length;

      if (articleCount >= 3) {
        detectedUrls.push(urlString);
      }
    } catch {
      continue;
    }
  }

  return detectedUrls;
}

