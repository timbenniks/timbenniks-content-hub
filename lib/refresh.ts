import Parser from "rss-parser";
import { db } from "./db";
import { normalizeUrl, urlToString } from "./url";
import { scrapeAndBuildRSS, RSSBuilderConfig } from "./rss-builder";
import { processFeedItems, FeedItem } from "./item-processor";
import {
  fireNewItemsWebhook,
  fireSourceRefreshWebhook,
} from "./webhooks";

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
  console.log(`[refreshSource] Fetching source ${sourceId} from database`);
  const source = await db.source.findUnique({
    where: { id: sourceId },
    include: { project: true },
  });

  if (!source) {
    console.error(`[refreshSource] Source ${sourceId} not found`);
    return { success: false, itemsAdded: 0, error: "Source not found" };
  }

  console.log(`[refreshSource] Found source: ${source.title || "Untitled"}, feedType: ${source.feedType}, feedUrl: ${source.feedUrl}`);

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

    // Fetch feed content manually to handle redirects properly
    // This avoids the "Too many redirects" error from rss-parser
    console.log(`[refreshSource] Fetching feed from: ${feedUrl}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for redirects

    let feedContent: string;
    let finalUrl = feedUrl;

    try {
      // Follow redirects manually with fetch (handles redirects better than rss-parser)
      const response = await fetch(feedUrl, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RSS-Reader/1.0)",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      finalUrl = response.url; // Get final URL after redirects
      feedContent = await response.text();
      console.log(`[refreshSource] Successfully fetched feed, final URL: ${finalUrl}, content length: ${feedContent.length}`);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      // Re-throw fetch errors - they'll be caught by the outer catch block
      throw new Error(`Failed to fetch feed: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
    }

    // Parse the fetched content (this avoids redirect issues)
    const feed = await parser.parseString(feedContent);

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
      // Fire webhook for empty refresh
      await fireSourceRefreshWebhook(source.projectId, source.id, true, 0);
      return { success: true, itemsAdded: 0 };
    }

    // Process items using shared utility
    const { itemsAdded, newItems } = await processFeedItems(
      feed.items as FeedItem[],
      source.projectId,
      source.id
    );

    // Fire webhook for new items
    if (newItems.length > 0) {
      await fireNewItemsWebhook(source.projectId, newItems);
    }

    // Fire webhook for source refresh
    await fireSourceRefreshWebhook(
      source.projectId,
      source.id,
      true,
      itemsAdded
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
    
    console.error(`[refreshSource] Error refreshing source ${sourceId}:`, errorMessage);
    console.error(`[refreshSource] Error stack:`, error instanceof Error ? error.stack : "No stack trace");

    try {
      // Update source with error
      await db.source.update({
        where: { id: sourceId },
        data: {
          lastFetchedAt: new Date(),
          status: "ERROR",
          lastError: errorMessage,
        },
      });

      // Fire webhook for failed refresh (don't let webhook errors break the flow)
      try {
        await fireSourceRefreshWebhook(
          source.projectId,
          source.id,
          false,
          0,
          errorMessage
        );
      } catch (webhookError) {
        console.error(`[refreshSource] Error firing webhook:`, webhookError);
      }
    } catch (dbError) {
      console.error(`[refreshSource] Error updating source status:`, dbError);
    }

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
    console.log(`[refreshCustomRSSSource] Starting custom RSS refresh for source ${source.id}`);
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

    console.log(`[refreshCustomRSSSource] Config:`, JSON.stringify(config, null, 2));
    // Generate RSS feed from HTML
    const rssXml = await scrapeAndBuildRSS(config);
    console.log(`[refreshCustomRSSSource] Generated RSS XML, length: ${rssXml.length}`);

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
      // Fire webhook for empty refresh
      await fireSourceRefreshWebhook(source.projectId, source.id, true, 0);
      return { success: true, itemsAdded: 0 };
    }

    // Process items using shared utility
    const { itemsAdded, newItems } = await processFeedItems(
      feed.items as FeedItem[],
      source.projectId,
      source.id
    );

    // Fire webhook for new items
    if (newItems.length > 0) {
      await fireNewItemsWebhook(source.projectId, newItems);
    }

    // Fire webhook for source refresh
    await fireSourceRefreshWebhook(
      source.projectId,
      source.id,
      true,
      itemsAdded
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

    console.log(`[refreshCustomRSSSource] Successfully refreshed source ${source.id}, added ${itemsAdded} items`);
    return { success: true, itemsAdded };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    
    console.error(`[refreshCustomRSSSource] Error refreshing custom RSS source ${source.id}:`, errorMessage);
    console.error(`[refreshCustomRSSSource] Error stack:`, error instanceof Error ? error.stack : "No stack trace");

    try {
      await db.source.update({
        where: { id: source.id },
        data: {
          lastFetchedAt: new Date(),
          status: "ERROR",
          lastError: errorMessage,
        },
      });

      // Fire webhook for failed refresh (don't let webhook errors break the flow)
      try {
        await fireSourceRefreshWebhook(
          source.projectId,
          source.id,
          false,
          0,
          errorMessage
        );
      } catch (webhookError) {
        console.error(`[refreshCustomRSSSource] Error firing webhook:`, webhookError);
      }
    } catch (dbError) {
      console.error(`[refreshCustomRSSSource] Error updating source status:`, dbError);
    }

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

