import * as cheerio from "cheerio";
import { normalizeUrl, urlToString } from "./url";

/**
 * Common feed URL patterns to try when auto-discovering
 */
const FEED_PATH_CANDIDATES = [
  "/feed",
  "/feed.xml",
  "/feed.rss",
  "/feed/atom",
  "/atom.xml",
  "/rss",
  "/rss.xml",
  "/rss/feed",
  "/index.xml",
  "/feeds/all.atom.xml",
  "/feeds/posts/default",
  "/blog/feed",
  "/blog/rss",
  "/.rss",
  "/.atom",
];

/**
 * Discover RSS/Atom feed URL from a homepage URL
 * First checks for <link rel="alternate"> tags, then tries common paths
 */
export async function discoverFeedUrl(homepageUrl: string): Promise<string | null> {
  const normalized = normalizeUrl(homepageUrl);
  if (!normalized) {
    return null;
  }

  const baseUrl = urlToString(normalized);

  try {
    // Fetch the homepage with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(baseUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RSS Aggregator/1.0)",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Check for <link rel="alternate"> tags
    const alternateLinks = $('link[rel="alternate"]');
    for (const link of alternateLinks.toArray()) {
      const type = $(link).attr("type");
      const href = $(link).attr("href");
      if (
        href &&
        (type?.includes("rss") ||
          type?.includes("atom") ||
          type?.includes("xml") ||
          href.includes("feed") ||
          href.includes("rss") ||
          href.includes("atom"))
      ) {
        const feedUrl = new URL(href, baseUrl);
        const normalizedFeed = normalizeUrl(feedUrl.toString());
        if (normalizedFeed) {
          return urlToString(normalizedFeed);
        }
      }
    }

    // Try common feed paths
    for (const path of FEED_PATH_CANDIDATES) {
      try {
        const candidateUrl = new URL(path, baseUrl);
        const normalizedCandidate = normalizeUrl(candidateUrl.toString());
        if (!normalizedCandidate) continue;

        const testResponse = await fetch(urlToString(normalizedCandidate), {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; RSS Aggregator/1.0)",
          },
        });

        if (testResponse.ok) {
          const contentType = testResponse.headers.get("content-type") || "";
          if (
            contentType.includes("xml") ||
            contentType.includes("rss") ||
            contentType.includes("atom")
          ) {
            return urlToString(normalizedCandidate);
          }
        }
      } catch {
        // Continue to next candidate
        continue;
      }
    }

    return null;
  } catch (error) {
    // Discovery failed, return null
    return null;
  }
}

