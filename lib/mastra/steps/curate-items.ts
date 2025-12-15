/**
 * Step: Curate and select relevant items for content creation
 */

import { createStep } from "@mastra/core/workflows";
import { Agent } from "@mastra/core";
import { z } from "zod";
import { getMastraConfig } from "../config";

const CurateItemsInputSchema = z.object({
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
  limit: z.number().optional().default(10),
});

const CurateItemsOutputSchema = z.object({
  selectedItems: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      url: z.string(),
      reasoning: z.string(),
    })
  ),
  clusters: z.array(
    z.object({
      topic: z.string(),
      itemIds: z.array(z.string()),
    })
  ),
});

export const curateItemsStep = createStep({
  id: "curate-items",
  description: "Curate Items",
  inputSchema: CurateItemsInputSchema,
  outputSchema: CurateItemsOutputSchema,
  execute: async ({ inputData }) => {
    const { items, limit } = inputData;
    const config = getMastraConfig();

    const agent = new Agent({
      name: "curator",
      instructions: `You are a content curator. Analyze RSS items and select the most relevant ones for content creation. Group related items by topic.`,
      model: config.defaultModel,
    });

    // Create a structured prompt for curation
    const itemsSummary = items
      .map(
        (item, idx) =>
          `${idx + 1}. ${item.title}\n   Source: ${item.source.title || item.source.siteUrl}\n   URL: ${item.url}\n   ${item.contentSnippet ? `Snippet: ${item.contentSnippet.substring(0, 200)}...` : ""}`
      )
      .join("\n\n");

    const prompt = `Analyze these ${items.length} RSS items and:

1. Group them into topic clusters (3-5 clusters max)
2. Select the top ${limit} most relevant items for content creation
3. For each selected item, provide a brief reasoning (1-2 sentences)

RSS Items:
${itemsSummary}

Respond in JSON format:
{
  "clusters": [
    {"topic": "Topic name", "itemIds": [1, 2, 3]},
    ...
  ],
  "selectedItems": [
    {"id": 1, "title": "Item title", "url": "item url", "reasoning": "why this is relevant"},
    ...
  ]
}`;

    const response = await agent.generate(prompt);

    try {
      // Extract JSON from response
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Map back to actual item IDs
      const selectedItems = parsed.selectedItems.map((selected: any) => {
        const itemIndex = parseInt(selected.id) - 1;
        const actualItem = items[itemIndex];
        if (!actualItem) {
          throw new Error(`Invalid item index: ${selected.id}`);
        }
        return {
          id: actualItem.id,
          title: actualItem.title,
          url: actualItem.url,
          reasoning: selected.reasoning || "Selected for relevance",
        };
      });

      const clusters = parsed.clusters.map((cluster: any) => ({
        topic: cluster.topic,
        itemIds: cluster.itemIds.map((idx: number) => {
          const itemIndex = idx - 1;
          return items[itemIndex]?.id;
        }).filter(Boolean),
      }));

      return {
        selectedItems: selectedItems.slice(0, limit),
        clusters,
      };
    } catch (error) {
      // Fallback: just select first N items
      return {
        selectedItems: items.slice(0, limit).map((item) => ({
          id: item.id,
          title: item.title,
          url: item.url,
          reasoning: "Selected as top items",
        })),
        clusters: [],
      };
    }
  },
});

