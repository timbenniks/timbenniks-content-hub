/**
 * Content Draft Workflow
 * 
 * Purpose: Generate social post summaries from selected items
 * Steps:
 * 1. Load voice profile and samples
 * 2. Load RSS items
 * 3. Generate summaries
 * 4. Save to draft
 */

import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { loadVoiceProfileStep } from "../steps/load-voice-profile";
import { loadItemsStep } from "../steps/load-items";
import { generateContentStep } from "../steps/generate-content";
import { db } from "@/lib/db";

const NewsletterDraftWorkflowInputSchema = z.object({
  projectId: z.string(),
  draftId: z.string(),
  itemIds: z.array(z.string()),
});

const NewsletterDraftWorkflowOutputSchema = z.object({
  draftId: z.string(),
  title: z.string(),
  content: z.string(),
});

// Step: Save draft
const saveDraftStep = createStep({
  id: "save-draft",
  description: "Save generated content to draft",
  inputSchema: z.object({
    draftId: z.string(),
    title: z.string(),
    content: z.string(),
    itemIds: z.array(z.string()),
  }),
  outputSchema: z.object({
    draftId: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { draftId, title, content, itemIds } = inputData;

    // Update draft with content
    await db.contentDraft.update({
      where: { id: draftId },
      data: {
        title,
        contentMarkdown: content,
        status: "NEEDS_REVIEW",
      },
    });

    // Ensure items are linked
    const existingItems = await db.draftItem.findMany({
      where: { draftId },
      select: { itemId: true },
    });

    const existingItemIds = new Set(existingItems.map((ei) => ei.itemId));

    // Add missing items
    const itemsToAdd = itemIds.filter((id) => !existingItemIds.has(id));
    if (itemsToAdd.length > 0) {
      await db.draftItem.createMany({
        data: itemsToAdd.map((itemId) => ({
          draftId,
          itemId,
        })),
        skipDuplicates: true,
      });
    }

    return { draftId };
  },
});

export const newsletterDraftWorkflow = createWorkflow({
  id: "newsletter-draft", // Keep ID for backward compatibility
  description: "Generate social post summaries from RSS items",
  inputSchema: NewsletterDraftWorkflowInputSchema,
  outputSchema: NewsletterDraftWorkflowOutputSchema,
  steps: [
    loadVoiceProfileStep,
    loadItemsStep,
    generateContentStep,
    saveDraftStep,
  ],
});

