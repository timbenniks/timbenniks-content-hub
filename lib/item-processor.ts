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
 */
export async function processFeedItem(
  item: FeedItem,
  projectId: string,
  sourceId: string
): Promise<boolean> {
  if (!item.link || !item.title) {
    return false; // Skip items without required fields
  }

  const normalizedItemUrl = normalizeUrl(item.link);
  if (!normalizedItemUrl) {
    return false;
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
          projectId,
          url: itemUrl,
        },
      },
      create: {
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
      update: {
        title: item.title,
        author: author,
        publishedAt: publishedAt,
        contentSnippet: contentSnippet,
        contentHtml: contentHtml,
      },
    });
    return true;
  } catch (error) {
    console.error(`Failed to upsert item: ${itemUrl}`, error);
    return false;
  }
}

/**
 * Process multiple feed items and return count of successful inserts
 */
export async function processFeedItems(
  items: FeedItem[],
  projectId: string,
  sourceId: string
): Promise<number> {
  let itemsAdded = 0;

  for (const item of items) {
    const success = await processFeedItem(item, projectId, sourceId);
    if (success) {
      itemsAdded++;
    }
  }

  return itemsAdded;
}

