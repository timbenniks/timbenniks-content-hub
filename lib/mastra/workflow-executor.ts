/**
 * Simplified workflow executor
 * Executes workflows step by step and handles suspend/resume
 */

import { db } from "@/lib/db";
import { loadItemsStep } from "./steps/load-items";
import { loadVoiceProfileStep } from "./steps/load-voice-profile";
import { curateItemsStep } from "./steps/curate-items";
import { generateContentStep } from "./steps/generate-content";
import { logWorkflowEvent, updateWorkflowRun } from "./workflow-runner";
import {
  createStepContext,
  executeStepWithLogging,
  withWorkflowErrorHandling,
  createSuspendHandler,
} from "./workflow-helpers";
import {
  loadItemsByIds,
  generateMarkdownFromSummaries,
  mergeSummaries,
} from "./item-utils";

export async function executeNewsletterDraftWorkflow(
  workflowRunId: string,
  input: {
    projectId: string;
    draftId: string;
    itemIds: string[];
    regenerateItemId?: string; // Optional: regenerate only this item
  }
) {
  return withWorkflowErrorHandling(workflowRunId, async () => {
    await logWorkflowEvent(workflowRunId, "LOG", {
      message: `Starting workflow execution for draft ${input.draftId}`,
      input: {
        projectId: input.projectId,
        draftId: input.draftId,
        itemCount: input.itemIds.length,
      },
    });

    const stepContext = createStepContext(workflowRunId, "newsletter-draft", input);

    // Step 1: Load voice profile
    const voiceProfileResult = await executeStepWithLogging(
      loadVoiceProfileStep,
      workflowRunId,
      "load-voice-profile",
      { projectId: input.projectId },
      stepContext
    );

    // Step 2: Load items
    // If regenerating a single item, load only that item
    // Otherwise, load all requested items
    const itemsToLoad = input.regenerateItemId
      ? [input.regenerateItemId]
      : input.itemIds;

    await logWorkflowEvent(workflowRunId, "STEP_START", {
      step: "load-items",
    });

    const filteredItems = await loadItemsByIds(itemsToLoad, input.projectId);

    await logWorkflowEvent(workflowRunId, "STEP_END", {
      step: "load-items",
      result: { items: filteredItems },
    });

    // Step 3: Generate content
    let suspendPayload: any = null;
    let suspended = false;

    const generateContext = createStepContext(workflowRunId, "newsletter-draft", input, {
      suspend: createSuspendHandler(workflowRunId, (payload) => {
        suspendPayload = payload;
        suspended = true;
      }),
    });

    const generateResult = await executeStepWithLogging(
      generateContentStep,
      workflowRunId,
      "generate-content",
      {
        items: filteredItems,
        voiceProfile: voiceProfileResult.voiceProfile,
      },
      generateContext
    );

    if (suspended) {
      return { suspended: true, payload: suspendPayload };
    }

    // Step 4: Save draft
    await logWorkflowEvent(workflowRunId, "STEP_START", {
      step: "save-draft",
    });

    // Get draft to merge with existing summaries if regenerating single item
    const draft = await db.contentDraft.findUnique({
      where: { id: input.draftId },
      select: { title: true, contentJson: true },
    });

    let finalSummaries: Array<{ itemId: string; summary: string }> = generateResult.itemSummaries;
    let finalMarkdown = generateResult.content;

    // If regenerating a single item, merge with existing summaries
    if (input.regenerateItemId && draft?.contentJson) {
      const existingSummaries: Array<{ itemId: string; summary: string }> =
        (draft.contentJson as any)?.itemSummaries || [];

      finalSummaries = mergeSummaries(existingSummaries, generateResult.itemSummaries);

      // Rebuild markdown with all items
      const allItemIds = finalSummaries.map((s: { itemId: string }) => s.itemId);
      const allItems = await loadItemsByIds(allItemIds, input.projectId);
      finalMarkdown = generateMarkdownFromSummaries(finalSummaries, allItems);
    }

    await db.contentDraft.update({
      where: { id: input.draftId },
      data: {
        contentMarkdown: finalMarkdown,
        contentJson: finalSummaries as any,
        status: "NEEDS_REVIEW",
      },
    });

    // Ensure items are linked
    // Use itemsToLoad (which respects regenerateItemId) instead of input.itemIds
    const existingItems = await db.draftItem.findMany({
      where: { draftId: input.draftId },
      select: { itemId: true },
    });

    const existingItemIds = new Set(existingItems.map((ei) => ei.itemId));

    const itemsToAdd = itemsToLoad.filter((id) => !existingItemIds.has(id));
    if (itemsToAdd.length > 0) {
      await db.draftItem.createMany({
        data: itemsToAdd.map((itemId) => ({
          draftId: input.draftId,
          itemId,
        })),
        skipDuplicates: true,
      });
    }

    await logWorkflowEvent(workflowRunId, "STEP_END", {
      step: "save-draft",
    });

    const result = {
      draftId: input.draftId,
      title: draft?.title || "Draft",
      content: generateResult.content,
      itemSummaries: generateResult.itemSummaries,
    };

    await updateWorkflowRun(workflowRunId, {
      status: "SUCCEEDED",
      output: result,
    });

    return result;
  });
}

export async function executeCurateItemsWorkflow(
  workflowRunId: string,
  input: {
    projectId: string;
    since?: string;
    limit?: number;
  }
) {
  return withWorkflowErrorHandling(workflowRunId, async () => {
    const stepContext = createStepContext(workflowRunId, "curate-items", input);

    // Step 1: Load items
    const itemsResult = await executeStepWithLogging(
      loadItemsStep,
      workflowRunId,
      "load-items",
      {
        projectId: input.projectId,
        since: input.since,
        limit: input.limit || 50,
      },
      stepContext
    );

    // Step 2: Curate items
    const curateContext = createStepContext(workflowRunId, "curate-items", input, {
      getStepResult: () => itemsResult as any,
    });

    const curateResult = await executeStepWithLogging(
      curateItemsStep,
      workflowRunId,
      "curate-items",
      {
        items: itemsResult.items,
        limit: input.limit || 10,
      },
      curateContext
    );

    await updateWorkflowRun(workflowRunId, {
      status: "SUCCEEDED",
      output: curateResult,
    });

    return curateResult;
  });
}

