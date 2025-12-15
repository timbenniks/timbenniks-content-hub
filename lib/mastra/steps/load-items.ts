/**
 * Step: Load RSS items from database
 */

import { db } from "@/lib/db";
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

const LoadItemsInputSchema = z.object({
  projectId: z.string(),
  since: z.string().optional(),
  limit: z.number().optional().default(50),
});

const LoadItemsOutputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      url: z.string(),
      author: z.string().nullable(),
      publishedAt: z.string().nullable(),
      contentSnippet: z.string().nullable(),
      source: z.object({
        id: z.string(),
        title: z.string().nullable(),
        siteUrl: z.string(),
      }),
    })
  ),
});

export const loadItemsStep = createStep({
  id: "load-items",
  description: "Load RSS Items",
  inputSchema: LoadItemsInputSchema,
  outputSchema: LoadItemsOutputSchema,
  execute: async ({ inputData }) => {
    const { projectId, since, limit } = inputData;

    const where: any = { projectId };

    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        where.publishedAt = { gte: sinceDate };
      }
    }

    const items = await db.item.findMany({
      where,
      include: {
        source: {
          select: {
            id: true,
            title: true,
            siteUrl: true,
          },
        },
      },
      orderBy: { publishedAt: "desc" },
      take: limit || 50,
    });

    return {
      items: items.map((item) => ({
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
      })),
    };
  },
});

