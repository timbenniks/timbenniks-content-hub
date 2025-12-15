/**
 * Utility functions for item transformation and formatting
 */

import { db } from "@/lib/db";

/**
 * Transforms a database item to the format expected by workflow steps
 */
export function mapItemToStepFormat(item: {
  id: string;
  title: string;
  url: string;
  author: string | null;
  publishedAt: Date | null;
  contentSnippet: string | null;
  source: {
    id: string;
    title: string | null;
    siteUrl: string;
  };
}) {
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    author: item.author,
    publishedAt: item.publishedAt?.toISOString() || null,
    contentSnippet: item.contentSnippet,
    source: {
      id: item.source.id,
      title: item.source.title,
      siteUrl: item.source.siteUrl,
    },
  };
}

/**
 * Loads items by IDs from the database and transforms them
 */
export async function loadItemsByIds(
  itemIds: string[],
  projectId: string
) {
  const items = await db.item.findMany({
    where: {
      id: { in: itemIds },
      projectId,
    },
    include: {
      source: {
        select: {
          id: true,
          title: true,
          siteUrl: true,
        },
      },
    },
  });

  return items.map(mapItemToStepFormat);
}

/**
 * Generates markdown content from item summaries
 */
export function generateMarkdownFromSummaries(
  summaries: Array<{ itemId: string; summary: string }>,
  items: Array<{ id: string; title: string; url: string }>
): string {
  return summaries
    .map((summary) => {
      const item = items.find((i) => i.id === summary.itemId);
      return `## ${item?.title || "Item"}\n\n${summary.summary}\n\n[Read more](${item?.url || "#"})`;
    })
    .join("\n\n---\n\n");
}

/**
 * Merges new summaries with existing summaries, updating or adding entries
 */
export function mergeSummaries(
  existingSummaries: Array<{ itemId: string; summary: string }>,
  newSummaries: Array<{ itemId: string; summary: string }>
): Array<{ itemId: string; summary: string }> {
  const summaryMap = new Map(
    existingSummaries.map((s) => [s.itemId, s])
  );

  newSummaries.forEach((summary) => {
    summaryMap.set(summary.itemId, summary);
  });

  return Array.from(summaryMap.values());
}

