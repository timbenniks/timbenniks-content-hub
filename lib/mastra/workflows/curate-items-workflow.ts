/**
 * Curate Items Workflow
 * 
 * Purpose: Pick relevant items for content creation
 * Input: projectId, since (optional), limit
 * Output: clusters, selectedItems with reasoning
 */

import { createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { loadItemsStep } from "../steps/load-items";
import { curateItemsStep } from "../steps/curate-items";

const CurateItemsWorkflowInputSchema = z.object({
  projectId: z.string(),
  since: z.string().optional(),
  limit: z.number().optional().default(10),
});

const CurateItemsWorkflowOutputSchema = z.object({
  clusters: z.array(
    z.object({
      topic: z.string(),
      itemIds: z.array(z.string()),
    })
  ),
  selectedItems: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      url: z.string(),
      reasoning: z.string(),
    })
  ),
});

export const curateItemsWorkflow = createWorkflow({
  id: "curate-items",
  description: "Curate and select relevant RSS items for content creation",
  inputSchema: CurateItemsWorkflowInputSchema,
  outputSchema: CurateItemsWorkflowOutputSchema,
  steps: [loadItemsStep, curateItemsStep],
});

