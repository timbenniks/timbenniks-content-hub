/**
 * Common item processing utilities for RSS feeds
 */

import { db } from "./db";
import { normalizeUrl, urlToString } from "./url";

export interface FeedItem {
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
 * Process and upsert a single feed item
 * Returns the created item if it was newly created, null if it already existed
 */
export async function processFeedItem(
  item: FeedItem,
  projectId: string,
  sourceId: string
): Promise<{
  created: boolean;
  itemId?: string;
}> {
  if (!item.link || !item.title) {
    return { created: false }; // Skip items without required fields
  }

  const normalizedItemUrl = normalizeUrl(item.link);
  if (!normalizedItemUrl) {
    return { created: false };
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
    // Check if item already exists
    const existing = await db.item.findUnique({
      where: {
        projectId_url: {
          projectId,
          url: itemUrl,
        },
      },
    });

    if (existing) {
      // Update existing item
      await db.item.update({
        where: {
          projectId_url: {
            projectId,
            url: itemUrl,
          },
        },
        data: {
          title: item.title,
          author: author,
          publishedAt: publishedAt,
          contentSnippet: contentSnippet,
          contentHtml: contentHtml,
        },
      });
      return { created: false };
    }

    // Create new item
    const newItem = await db.item.create({
      data: {
        projectId,
        sourceId,
        guid: item.guid || null,
        url: itemUrl,
        title: item.title,
        author: author,
        publishedAt: publishedAt,
        contentSnippet: contentSnippet,
        contentHtml: contentHtml,
      },
    });
    return { created: true, itemId: newItem.id };
  } catch (error) {
    console.error(`Failed to upsert item: ${itemUrl}`, error);
    return { created: false };
  }
}

/**
 * Process multiple feed items and return count of successful inserts and new items
 */
export async function processFeedItems(
  items: FeedItem[],
  projectId: string,
  sourceId: string
): Promise<{
  itemsAdded: number;
  newItems: Array<{
    id: string;
    title: string;
    url: string;
    author?: string | null;
    publishedAt?: Date | null;
    contentSnippet?: string | null;
    source: {
      id: string;
      title: string | null;
      siteUrl: string;
    };
  }>;
}> {
  let itemsAdded = 0;
  const newItems: Array<{
    id: string;
    title: string;
    url: string;
    author?: string | null;
    publishedAt?: Date | null;
    contentSnippet?: string | null;
    source: {
      id: string;
      title: string | null;
      siteUrl: string;
    };
  }> = [];

  // Get source info for webhook payload
  const source = await db.source.findUnique({
    where: { id: sourceId },
    select: { id: true, title: true, siteUrl: true },
  });

  for (const item of items) {
    const result = await processFeedItem(item, projectId, sourceId);
    if (result.created && result.itemId && source) {
      itemsAdded++;
      newItems.push({
        id: result.itemId,
        title: item.title || "",
        url: item.link || "",
        author: item.creator || item.author || null,
        publishedAt: item.pubDate
          ? new Date(item.pubDate)
          : item.isoDate
            ? new Date(item.isoDate)
            : null,
        contentSnippet:
          item.contentSnippet ||
          item["content:encoded"]?.substring(0, 500) ||
          item.content?.substring(0, 500) ||
          null,
        source: {
          id: source.id,
          title: source.title,
          siteUrl: source.siteUrl,
        },
      });
    }
  }

  return { itemsAdded, newItems };
}

