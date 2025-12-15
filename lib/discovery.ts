import * as cheerio from "cheerio";
import { normalizeUrl, urlToString } from "./url";
import { detectCloudflareProtection } from "./cloudflare-detection";
import { fetchWithTimeout } from "./fetch-utils";

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
  "/news/rss.xml", // Common pattern for news sections (e.g., openai.com/news/rss.xml)
  "/news/feed",
  "/news/rss",
  "/index.xml",
  "/feeds/all.atom.xml",
  "/feeds/posts/default",
  "/blog/feed",
  "/blog/rss",
  "/.rss",
  "/.atom",
];

export interface DiscoveredFeed {
  url: string;
  title?: string;
  type?: string;
  cloudflareProtected?: boolean;
  cloudflareConfidence?: "low" | "medium" | "high";
}

/**
 * Check if a URL is already a direct RSS/Atom feed
 * Returns the feed URL if it's a direct feed, null otherwise
 */
async function checkDirectFeedUrl(url: string): Promise<string | null> {
  try {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      return null;
    }

    const urlString = urlToString(normalized);

    // Try to fetch and verify it's actually a feed
    const response = await fetchWithTimeout(urlString, {
      timeout: 10000,
      headers: {
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    const isFeedContentType =
      contentType.includes("xml") ||
      contentType.includes("rss") ||
      contentType.includes("atom");

    // Check if it's a feed by content type or by examining the content
    if (isFeedContentType) {
      // Try to parse a small sample to verify it's valid XML/RSS
      const text = await response.text();
      const trimmed = text.trim();

      // Check for RSS/Atom XML structure
      if (
        trimmed.startsWith("<?xml") &&
        (trimmed.includes("<rss") ||
          trimmed.includes("<feed") ||
          trimmed.includes("<rdf:RDF"))
      ) {
        return urlString;
      }
    }

    // Also check URL patterns as a hint (but don't require them)
    const feedPatterns = [
      /\/feed/i,
      /\/rss/i,
      /\/atom/i,
      /\.xml$/i,
      /\.rss$/i,
    ];

    const isLikelyFeed = feedPatterns.some((pattern) => pattern.test(urlString));

    // If URL pattern suggests it's a feed, check the content even if content-type doesn't
    if (isLikelyFeed && !isFeedContentType) {
      const text = await response.text();
      const trimmed = text.trim();

      // Check for RSS/Atom XML structure
      if (
        trimmed.startsWith("<?xml") &&
        (trimmed.includes("<rss") ||
          trimmed.includes("<feed") ||
          trimmed.includes("<rdf:RDF"))
      ) {
        return urlString;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Discover all RSS/Atom feed URLs from a homepage URL
 * Returns an array of discovered feeds with their metadata
 */
export async function discoverAllFeeds(
  homepageUrl: string
): Promise<{
  feeds: DiscoveredFeed[];
  cloudflareProtected: boolean;
  cloudflareConfidence: "low" | "medium" | "high";
}> {
  const normalized = normalizeUrl(homepageUrl);
  if (!normalized) {
    return {
      feeds: [],
      cloudflareProtected: false,
      cloudflareConfidence: "low",
    };
  }

  const baseUrl = urlToString(normalized);
  const discoveredFeedsMap = new Map<string, DiscoveredFeed>();
  let cloudflareProtected = false;
  let cloudflareConfidence: "low" | "medium" | "high" = "low";

  // First, check if the URL is already a direct feed
  const directFeedUrl = await checkDirectFeedUrl(baseUrl);
  if (directFeedUrl) {
    discoveredFeedsMap.set(directFeedUrl, {
      url: directFeedUrl,
      title: "Direct Feed",
      type: "RSS/Atom",
    });
  }

  try {
    // Fetch the homepage with timeout
    const response = await fetchWithTimeout(baseUrl, { timeout: 10000 });

    if (!response.ok) {
      // If request failed, try common feed paths as fallback
      if (discoveredFeedsMap.size === 0) {
        for (const path of FEED_PATH_CANDIDATES) {
          try {
            const candidateUrl = new URL(path, baseUrl);
            const normalizedCandidate = normalizeUrl(candidateUrl.toString());
            if (!normalizedCandidate) continue;

            const candidateUrlString = urlToString(normalizedCandidate);
            const verifiedFeed = await checkDirectFeedUrl(candidateUrlString);
            if (verifiedFeed && !discoveredFeedsMap.has(verifiedFeed)) {
              discoveredFeedsMap.set(verifiedFeed, {
                url: verifiedFeed,
                title: undefined,
                type: undefined,
                cloudflareProtected,
                cloudflareConfidence,
              });
            }
          } catch {
            continue;
          }
        }
      }
      return {
        feeds: Array.from(discoveredFeedsMap.values()),
        cloudflareProtected,
        cloudflareConfidence,
      };
    }

    const contentType = response.headers.get("content-type") || "";
    const html = await response.text();

    // Detect Cloudflare protection
    const cloudflareDetection = await detectCloudflareProtection(
      baseUrl,
      response,
      html
    );
    const isChallengePage = cloudflareDetection.isProtected;
    cloudflareProtected = cloudflareDetection.isProtected;
    cloudflareConfidence = cloudflareDetection.confidence;

    // If it's HTML and not a challenge page, parse it for feed links
    if (contentType.includes("html") && !isChallengePage) {
      const $ = cheerio.load(html);

      // Check for <link rel="alternate"> tags (most common way sites declare feeds)
      const alternateLinks = $('link[rel="alternate"]');
      for (const link of alternateLinks.toArray()) {
        const type = $(link).attr("type");
        const href = $(link).attr("href");
        const title = $(link).attr("title");

        if (!href) continue;

        // Check if it's a feed link by type or href pattern
        const isFeedType =
          type?.includes("rss") ||
          type?.includes("atom") ||
          type?.includes("xml") ||
          type === "application/rss+xml" ||
          type === "application/atom+xml" ||
          type === "application/xml";

        const isFeedHref =
          href.includes("feed") ||
          href.includes("rss") ||
          href.includes("atom") ||
          href.endsWith(".xml") ||
          href.endsWith(".rss");

        if (isFeedType || isFeedHref) {
          try {
            const feedUrl = new URL(href, baseUrl);
            const normalizedFeed = normalizeUrl(feedUrl.toString());
            if (normalizedFeed) {
              const feedUrlString = urlToString(normalizedFeed);
              // Verify it's actually a feed by checking the URL
              const verifiedFeed = await checkDirectFeedUrl(feedUrlString);
              if (verifiedFeed && !discoveredFeedsMap.has(verifiedFeed)) {
                discoveredFeedsMap.set(verifiedFeed, {
                  url: verifiedFeed,
                  title: title || undefined,
                  type: type || undefined,
                  cloudflareProtected,
                  cloudflareConfidence,
                });
              }
            }
          } catch {
            // Invalid URL, continue to next
            continue;
          }
        }
      }

      // Also check for <link rel="feed"> (less common but some sites use it)
      const feedLinks = $('link[rel="feed"], link[rel*="feed"]');
      for (const link of feedLinks.toArray()) {
        const href = $(link).attr("href");
        const title = $(link).attr("title");
        if (href) {
          try {
            const feedUrl = new URL(href, baseUrl);
            const normalizedFeed = normalizeUrl(feedUrl.toString());
            if (normalizedFeed) {
              const feedUrlString = urlToString(normalizedFeed);
              const verifiedFeed = await checkDirectFeedUrl(feedUrlString);
              if (verifiedFeed && !discoveredFeedsMap.has(verifiedFeed)) {
                discoveredFeedsMap.set(verifiedFeed, {
                  url: verifiedFeed,
                  title: title || undefined,
                  type: "RSS/Atom",
                  cloudflareProtected,
                  cloudflareConfidence,
                });
              }
            }
          } catch {
            continue;
          }
        }
      }

      // Try common feed paths as fallback (only if we haven't found any yet)
      if (discoveredFeedsMap.size === 0) {
        for (const path of FEED_PATH_CANDIDATES) {
          try {
            const candidateUrl = new URL(path, baseUrl);
            const normalizedCandidate = normalizeUrl(candidateUrl.toString());
            if (!normalizedCandidate) continue;

            const candidateUrlString = urlToString(normalizedCandidate);

            // Use checkDirectFeedUrl to verify it's actually a feed
            const verifiedFeed = await checkDirectFeedUrl(candidateUrlString);
            if (verifiedFeed && !discoveredFeedsMap.has(verifiedFeed)) {
              discoveredFeedsMap.set(verifiedFeed, {
                url: verifiedFeed,
                title: undefined,
                type: undefined,
                cloudflareProtected,
                cloudflareConfidence,
              });
            }
          } catch {
            // Continue to next candidate
            continue;
          }
        }
      }
    }
    
    // If it's a challenge page or we haven't found feeds, try common paths
    // Also try common paths even if we found feeds in HTML (some sites have multiple feeds)
    if (isChallengePage || discoveredFeedsMap.size === 0) {
      for (const path of FEED_PATH_CANDIDATES) {
        try {
          const candidateUrl = new URL(path, baseUrl);
          const normalizedCandidate = normalizeUrl(candidateUrl.toString());
          if (!normalizedCandidate) continue;

          const candidateUrlString = urlToString(normalizedCandidate);

          // Use checkDirectFeedUrl to verify it's actually a feed
          const verifiedFeed = await checkDirectFeedUrl(candidateUrlString);
          if (verifiedFeed && !discoveredFeedsMap.has(verifiedFeed)) {
            discoveredFeedsMap.set(verifiedFeed, {
              url: verifiedFeed,
              title: undefined,
              type: undefined,
              cloudflareProtected,
              cloudflareConfidence,
            });
          }
        } catch {
          // Continue to next candidate
          continue;
        }
      }
    }

    return {
      feeds: Array.from(discoveredFeedsMap.values()),
      cloudflareProtected,
      cloudflareConfidence,
    };
  } catch (error) {
    // If HTML parsing failed (e.g., Cloudflare challenge), try common feed paths anyway
    if (discoveredFeedsMap.size === 0) {
      for (const path of FEED_PATH_CANDIDATES) {
        try {
          const candidateUrl = new URL(path, baseUrl);
          const normalizedCandidate = normalizeUrl(candidateUrl.toString());
          if (!normalizedCandidate) continue;

          const candidateUrlString = urlToString(normalizedCandidate);

          // Use checkDirectFeedUrl to verify it's actually a feed
          const verifiedFeed = await checkDirectFeedUrl(candidateUrlString);
          if (verifiedFeed && !discoveredFeedsMap.has(verifiedFeed)) {
            discoveredFeedsMap.set(verifiedFeed, {
              url: verifiedFeed,
              title: undefined,
              type: undefined,
              cloudflareProtected,
              cloudflareConfidence,
            });
          }
        } catch {
          // Continue to next candidate
          continue;
        }
      }
    }
    
    // Discovery failed, return what we found so far
    return {
      feeds: Array.from(discoveredFeedsMap.values()),
      cloudflareProtected,
      cloudflareConfidence,
    };
  }
}

/**
 * Discover RSS/Atom feed URL from a homepage URL
 * First checks if the URL is already a direct feed, then checks for <link rel="alternate"> tags, then tries common paths
 * Returns the first feed found (for backward compatibility)
 */
export async function discoverFeedUrl(homepageUrl: string): Promise<string | null> {
  const result = await discoverAllFeeds(homepageUrl);
  return result.feeds.length > 0 ? result.feeds[0].url : null;
}
