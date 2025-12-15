/**
 * Simplified workflow executor
 * Executes workflows step by step and handles suspend/resume
 */

import { db } from "@/lib/db";
import { loadItemsStep } from "./steps/load-items";
import { loadVoiceProfileStep } from "./steps/load-voice-profile";
import { curateItemsStep } from "./steps/curate-items";
import { generateContentStep } from "./steps/generate-content";
import {
  updateWorkflowRun,
  logWorkflowEvent,
} from "./workflow-runner";
import { EMITTER_SYMBOL, STREAM_FORMAT_SYMBOL } from "@mastra/core/workflows/_constants";

export async function executeNewsletterDraftWorkflow(
  workflowRunId: string,
  input: {
    projectId: string;
    draftId: string;
    itemIds: string[];
    regenerateItemId?: string; // Optional: regenerate only this item
  }
) {
  try {
    await logWorkflowEvent(workflowRunId, "LOG", {
      message: `Starting workflow execution for draft ${input.draftId}`,
      input: {
        projectId: input.projectId,
        draftId: input.draftId,
        itemCount: input.itemIds.length,
      },
    });
    // Step 1: Load voice profile
    await logWorkflowEvent(workflowRunId, "STEP_START", {
      step: "load-voice-profile",
    });

    const voiceProfileResult = await loadVoiceProfileStep.execute({
      inputData: { projectId: input.projectId },
      state: {},
      setState: () => {},
      runId: workflowRunId,
      workflowId: "newsletter-draft",
      mastra: {} as any,
      runtimeContext: {} as any,
      getInitData: () => input,
      getStepResult: () => ({} as any),
      suspend: async () => {},
      bail: () => {},
      abort: () => {},
      runCount: 1,
      tracingContext: {} as any,
      [EMITTER_SYMBOL]: {
        emit: async () => {},
        on: () => {},
        off: () => {},
        once: () => {},
      } as any,
      [STREAM_FORMAT_SYMBOL]: undefined,
      engine: "default",
      abortSignal: new AbortController().signal,
      writer: {} as any,
    });

    await logWorkflowEvent(workflowRunId, "STEP_END", {
      step: "load-voice-profile",
      result: voiceProfileResult,
    });

    // Step 2: Load items
    await logWorkflowEvent(workflowRunId, "STEP_START", {
      step: "load-items",
    });

    const itemsResult = await loadItemsStep.execute({
      inputData: {
        projectId: input.projectId,
        limit: input.itemIds.length || 50,
      },
      state: {},
      setState: () => {},
      runId: workflowRunId,
      workflowId: "newsletter-draft",
      mastra: {} as any,
      runtimeContext: {} as any,
      getInitData: () => input,
      getStepResult: () => ({} as any),
      suspend: async () => {},
      bail: () => {},
      abort: () => {},
      runCount: 1,
      tracingContext: {} as any,
      [EMITTER_SYMBOL]: {
        emit: async () => {},
        on: () => {},
        off: () => {},
        once: () => {},
      } as any,
      [STREAM_FORMAT_SYMBOL]: undefined,
      engine: "default",
      abortSignal: new AbortController().signal,
      writer: {} as any,
    });

    // Filter items to only those requested (if not single item regeneration)
    const filteredItems = input.regenerateItemId
      ? itemsResult.items
      : itemsResult.items.filter((item) => input.itemIds.includes(item.id));

    await logWorkflowEvent(workflowRunId, "STEP_END", {
      step: "load-items",
      result: { items: filteredItems },
    });

    // Step 3: Generate content
    await logWorkflowEvent(workflowRunId, "STEP_START", {
      step: "generate-content",
    });

    let suspendPayload: any = null;
    let suspended = false;

    const generateResult = await generateContentStep.execute({
      inputData: {
        items: filteredItems,
        voiceProfile: voiceProfileResult.voiceProfile,
      },
      state: {},
      setState: () => {},
      runId: workflowRunId,
      workflowId: "newsletter-draft",
      mastra: {} as any,
      runtimeContext: {} as any,
      getInitData: () => input,
      getStepResult: () => ({} as any),
      suspend: async (payload: any) => {
        suspendPayload = payload;
        suspended = true;
        await updateWorkflowRun(workflowRunId, {
          status: "SUSPENDED",
          snapshotRef: JSON.stringify(payload),
        });
        await logWorkflowEvent(workflowRunId, "LOG", {
          message: "Workflow suspended for human review",
          payload,
        });
      },
      bail: () => {},
      abort: () => {},
      runCount: 1,
      tracingContext: {} as any,
      [EMITTER_SYMBOL]: {
        emit: async () => {},
        on: () => {},
        off: () => {},
        once: () => {},
      } as any,
      [STREAM_FORMAT_SYMBOL]: undefined,
      engine: "default",
      abortSignal: new AbortController().signal,
      writer: {} as any,
    });

    if (suspended) {
      return { suspended: true, payload: suspendPayload };
    }

    await logWorkflowEvent(workflowRunId, "STEP_END", {
      step: "generate-content",
      result: generateResult,
    });

    // Step 4: Save draft
    await logWorkflowEvent(workflowRunId, "STEP_START", {
      step: "save-draft",
    });

    // Get draft to merge with existing summaries if regenerating single item
    const draft = await db.contentDraft.findUnique({
      where: { id: input.draftId },
      select: { title: true, contentJson: true },
    });

    let finalSummaries: Array<{ itemId: string; summary: string }> =
      generateResult.itemSummaries;
    let finalMarkdown = generateResult.content;

    // If regenerating a single item, merge with existing summaries
    if (input.regenerateItemId && draft?.contentJson) {
      const existingSummaries: Array<{ itemId: string; summary: string }> =
        (draft.contentJson as any)?.itemSummaries || [];
      const existingMap = new Map(
        existingSummaries.map((s) => [s.itemId, s])
      );

      // Update or add the regenerated summaries
      generateResult.itemSummaries.forEach((summary) => {
        existingMap.set(summary.itemId, summary);
      });

      finalSummaries = Array.from(existingMap.values());

      // Rebuild markdown with all items (load directly from DB)
      const allItemIds = Array.from(existingMap.keys());
      const allItems = await db.item.findMany({
        where: {
          id: { in: allItemIds },
          projectId: input.projectId,
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

      finalMarkdown = finalSummaries
        .map((summary) => {
          const item = allItems.find((i) => i.id === summary.itemId);
          return `## ${item?.title || "Item"}\n\n${summary.summary}\n\n[Read more](${item?.url || "#"})`;
        })
        .join("\n\n---\n\n");
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
    const existingItems = await db.draftItem.findMany({
      where: { draftId: input.draftId },
      select: { itemId: true },
    });

    const existingItemIds = new Set(existingItems.map((ei) => ei.itemId));

    const itemsToAdd = input.itemIds.filter((id) => !existingItemIds.has(id));
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
  } catch (error) {
    await updateWorkflowRun(workflowRunId, {
      status: "FAILED",
      error: error instanceof Error ? error.message : String(error),
    });

    await logWorkflowEvent(workflowRunId, "ERROR", {
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

export async function executeCurateItemsWorkflow(
  workflowRunId: string,
  input: {
    projectId: string;
    since?: string;
    limit?: number;
  }
) {
  try {
    // Step 1: Load items
    await logWorkflowEvent(workflowRunId, "STEP_START", {
      step: "load-items",
    });

    const itemsResult = await loadItemsStep.execute({
      inputData: {
        projectId: input.projectId,
        since: input.since,
        limit: input.limit || 50,
      },
      state: {},
      setState: () => {},
      runId: workflowRunId,
      workflowId: "curate-items",
      mastra: {} as any,
      runtimeContext: {} as any,
      getInitData: () => input,
      getStepResult: () => ({} as any),
      suspend: async () => {},
      bail: () => {},
      abort: () => {},
      runCount: 1,
      tracingContext: {} as any,
      [EMITTER_SYMBOL]: {
        emit: async () => {},
        on: () => {},
        off: () => {},
        once: () => {},
      } as any,
      [STREAM_FORMAT_SYMBOL]: undefined,
      engine: "default",
      abortSignal: new AbortController().signal,
      writer: {} as any,
    });

    await logWorkflowEvent(workflowRunId, "STEP_END", {
      step: "load-items",
      result: itemsResult,
    });

    // Step 2: Curate items
    await logWorkflowEvent(workflowRunId, "STEP_START", {
      step: "curate-items",
    });

    const curateResult = await curateItemsStep.execute({
      inputData: {
        items: itemsResult.items,
        limit: input.limit || 10,
      },
      state: {},
      setState: () => {},
      runId: workflowRunId,
      workflowId: "curate-items",
      mastra: {} as any,
      runtimeContext: {} as any,
      getInitData: () => input,
      getStepResult: () => itemsResult as any,
      suspend: async () => {},
      bail: () => {},
      abort: () => {},
      runCount: 1,
      tracingContext: {} as any,
      [EMITTER_SYMBOL]: {
        emit: async () => {},
        on: () => {},
        off: () => {},
        once: () => {},
      } as any,
      [STREAM_FORMAT_SYMBOL]: undefined,
      engine: "default",
      abortSignal: new AbortController().signal,
      writer: {} as any,
    });

    await logWorkflowEvent(workflowRunId, "STEP_END", {
      step: "curate-items",
      result: curateResult,
    });

    await updateWorkflowRun(workflowRunId, {
      status: "SUCCEEDED",
      output: curateResult,
    });

    return curateResult;
  } catch (error) {
    await updateWorkflowRun(workflowRunId, {
      status: "FAILED",
      error: error instanceof Error ? error.message : String(error),
    });

    await logWorkflowEvent(workflowRunId, "ERROR", {
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}

