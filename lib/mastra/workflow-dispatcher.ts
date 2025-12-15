/**
 * Workflow dispatcher - maps workflow names to their execution functions
 */

import {
  executeNewsletterDraftWorkflow,
  executeCurateItemsWorkflow,
} from "./workflow-executor";

export type WorkflowName = "curate-items" | "newsletter-draft";

export type WorkflowInputs = {
  "curate-items": {
    projectId: string;
    since?: string;
    limit?: number;
  };
  "newsletter-draft": {
    projectId: string;
    draftId: string;
    itemIds: string[];
    regenerateItemId?: string;
  };
};

const workflowExecutors = {
  "curate-items": executeCurateItemsWorkflow,
  "newsletter-draft": executeNewsletterDraftWorkflow,
} as const;

/**
 * Executes a workflow by name
 */
export async function executeWorkflow<T extends WorkflowName>(
  workflowName: T,
  workflowRunId: string,
  input: WorkflowInputs[T]
): Promise<any> {
  const executor = workflowExecutors[workflowName];
  if (!executor) {
    throw new Error(`Unknown workflow: ${workflowName}`);
  }
  // Type assertion needed because TypeScript can't narrow the union type properly
  return executor(workflowRunId, input as any);
}

