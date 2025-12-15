import Parser from "rss-parser";
import { db } from "./db";
import { normalizeUrl, urlToString } from "./url";
import { scrapeAndBuildRSS, RSSBuilderConfig } from "./rss-builder";
import { processFeedItems, FeedItem } from "./item-processor";

const parser = new Parser({
  timeout: 10000, // 10s timeout
  customFields: {
    item: ["content:encoded", "content", "description"],
  },
});


/**
 * Refresh a single source and update items
 */
export async function refreshSource(sourceId: string): Promise<{
  success: boolean;
  itemsAdded: number;
  error?: string;
}> {
  const source = await db.source.findUnique({
    where: { id: sourceId },
    include: { project: true },
  });

  if (!source) {
    return { success: false, itemsAdded: 0, error: "Source not found" };
  }

  try {
    // Handle custom RSS sources differently
    if (source.feedType === "CUSTOM") {
      return await refreshCustomRSSSource(source);
    }

    const normalized = normalizeUrl(source.feedUrl);
    if (!normalized) {
      throw new Error("Invalid feed URL");
    }

    const feedUrl = urlToString(normalized);

    // Fetch and parse feed with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const feed = await parser.parseURL(feedUrl);

    clearTimeout(timeoutId);

    // Extract feed metadata
    const feedTitle = feed.title || null;
    const feedDescription = feed.description || null;

    if (!feed.items || feed.items.length === 0) {
      // Update source status and metadata but don't mark as error if feed is just empty
      await db.source.update({
        where: { id: sourceId },
        data: {
          ...(feedTitle && !source.title && { title: feedTitle }),
          ...(feedDescription && !source.description && { description: feedDescription }),
          lastFetchedAt: new Date(),
          status: "ACTIVE",
          lastError: null,
        },
      });
      return { success: true, itemsAdded: 0 };
    }

    // Process items using shared utility
    const itemsAdded = await processFeedItems(
      feed.items as FeedItem[],
      source.projectId,
      source.id
    );

    // Update source status (metadata was already updated earlier if feed was empty)
    await db.source.update({
      where: { id: sourceId },
      data: {
        ...(feedTitle && !source.title && { title: feedTitle }),
        ...(feedDescription && !source.description && { description: feedDescription }),
        lastFetchedAt: new Date(),
        status: "ACTIVE",
        lastError: null,
      },
    });

    return { success: true, itemsAdded };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Update source with error
    await db.source.update({
      where: { id: sourceId },
      data: {
        lastFetchedAt: new Date(),
        status: "ERROR",
        lastError: errorMessage,
      },
    });

    return { success: false, itemsAdded: 0, error: errorMessage };
  }
}

/**
 * Refresh a custom RSS source by scraping HTML and generating RSS
 */
async function refreshCustomRSSSource(source: {
  id: string;
  projectId: string;
  siteUrl: string;
  feedUrl: string;
  title: string | null;
  customRSSConfig: any;
}): Promise<{
  success: boolean;
  itemsAdded: number;
  error?: string;
}> {
  try {
    const config: RSSBuilderConfig = {
      siteUrl: source.siteUrl,
      articleListUrl: source.customRSSConfig?.articleListUrl || source.siteUrl,
      articleSelector: source.customRSSConfig?.articleSelector,
      titleSelector: source.customRSSConfig?.titleSelector,
      linkSelector: source.customRSSConfig?.linkSelector,
      dateSelector: source.customRSSConfig?.dateSelector,
      contentSelector: source.customRSSConfig?.contentSelector,
      authorSelector: source.customRSSConfig?.authorSelector,
      maxItems: source.customRSSConfig?.maxItems || 20,
    };

    // Generate RSS feed from HTML
    const rssXml = await scrapeAndBuildRSS(config);

    // Parse the generated RSS feed
    const feed = await parser.parseString(rssXml);

    // Extract feed metadata
    const feedTitle = feed.title || source.title || null;
    const feedDescription = feed.description || null;

    if (!feed.items || feed.items.length === 0) {
      await db.source.update({
        where: { id: source.id },
        data: {
          ...(feedTitle && !source.title && { title: feedTitle }),
          ...(feedDescription && { description: feedDescription }),
          lastFetchedAt: new Date(),
          status: "ACTIVE",
          lastError: null,
        },
      });
      return { success: true, itemsAdded: 0 };
    }

    // Process items using shared utility
    const itemsAdded = await processFeedItems(
      feed.items as FeedItem[],
      source.projectId,
      source.id
    );

    await db.source.update({
      where: { id: source.id },
      data: {
        ...(feedTitle && !source.title && { title: feedTitle }),
        ...(feedDescription && { description: feedDescription }),
        lastFetchedAt: new Date(),
        status: "ACTIVE",
        lastError: null,
      },
    });

    return { success: true, itemsAdded };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await db.source.update({
      where: { id: source.id },
      data: {
        lastFetchedAt: new Date(),
        status: "ERROR",
        lastError: errorMessage,
      },
    });

    return { success: false, itemsAdded: 0, error: errorMessage };
  }
}

/**
 * Refresh all sources in a project
 */
export async function refreshProject(projectId: string): Promise<{
  success: boolean;
  sourcesProcessed: number;
  sourcesSucceeded: number;
  sourcesFailed: number;
  totalItemsAdded: number;
}> {
  const sources = await db.source.findMany({
    where: { projectId },
  });

  let sourcesSucceeded = 0;
  let sourcesFailed = 0;
  let totalItemsAdded = 0;

  // Refresh sources in parallel (with reasonable concurrency)
  const results = await Promise.allSettled(
    sources.map((source: { id: string }) => refreshSource(source.id))
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      if (result.value.success) {
        sourcesSucceeded++;
        totalItemsAdded += result.value.itemsAdded;
      } else {
        sourcesFailed++;
      }
    } else {
      sourcesFailed++;
    }
  }

  return {
    success: sourcesSucceeded > 0 || sources.length === 0,
    sourcesProcessed: sources.length,
    sourcesSucceeded,
    sourcesFailed,
    totalItemsAdded,
  };
}

