import Parser from "rss-parser";
import { db } from "./db";
import { normalizeUrl, urlToString } from "./url";

const parser = new Parser({
  timeout: 10000, // 10s timeout
  customFields: {
    item: ["content:encoded", "content", "description"],
  },
});

interface FeedItem {
  guid?: string;
  link?: string;
  title?: string;
  creator?: string;
  author?: string;
  pubDate?: string;
  isoDate?: string;
  contentSnippet?: string;
  content?: string;
  "content:encoded"?: string;
}

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

    if (!feed.items || feed.items.length === 0) {
      // Update source status but don't mark as error if feed is just empty
      await db.source.update({
        where: { id: sourceId },
        data: {
          lastFetchedAt: new Date(),
          status: "ACTIVE",
          lastError: null,
        },
      });
      return { success: true, itemsAdded: 0 };
    }

    let itemsAdded = 0;

    // Upsert items
    for (const item of feed.items as FeedItem[]) {
      if (!item.link || !item.title) {
        continue; // Skip items without required fields
      }

      const normalizedItemUrl = normalizeUrl(item.link);
      if (!normalizedItemUrl) {
        continue;
      }

      const itemUrl = urlToString(normalizedItemUrl);

      // Parse published date
      let publishedAt: Date | null = null;
      if (item.pubDate) {
        publishedAt = new Date(item.pubDate);
        if (isNaN(publishedAt.getTime())) {
          publishedAt = null;
        }
      } else if (item.isoDate) {
        publishedAt = new Date(item.isoDate);
        if (isNaN(publishedAt.getTime())) {
          publishedAt = null;
        }
      }

      // Get content snippet
      const contentSnippet =
        item.contentSnippet ||
        item["content:encoded"]?.substring(0, 500) ||
        item.content?.substring(0, 500) ||
        null;

      // Get HTML content
      const contentHtml =
        item["content:encoded"] || item.content || contentSnippet || null;

      // Get author
      const author = item.creator || item.author || null;

      try {
        await db.item.upsert({
          where: {
            projectId_url: {
              projectId: source.projectId,
              url: itemUrl,
            },
          },
          create: {
            projectId: source.projectId,
            sourceId: source.id,
            guid: item.guid || null,
            url: itemUrl,
            title: item.title,
            author: author,
            publishedAt: publishedAt,
            contentSnippet: contentSnippet,
            contentHtml: contentHtml,
          },
          update: {
            // Update fields that might have changed
            title: item.title,
            author: author,
            publishedAt: publishedAt,
            contentSnippet: contentSnippet,
            contentHtml: contentHtml,
          },
        });
        itemsAdded++;
      } catch (error) {
        // Skip duplicate or invalid items, continue with others
        console.error(`Failed to upsert item: ${itemUrl}`, error);
      }
    }

    // Update source status
    await db.source.update({
      where: { id: sourceId },
      data: {
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

