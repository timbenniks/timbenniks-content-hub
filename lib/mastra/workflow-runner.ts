/**
 * Workflow runner utilities for persisting workflow runs to database
 */

import { db } from "@/lib/db";
import { WorkflowRunStatus } from "@/lib/generated/prisma/client";

export interface WorkflowRunData {
  projectId: string;
  draftId?: string;
  createdByUserId: string;
  workflowName: string;
  input: any;
}

/**
 * Create a workflow run record in the database
 */
export async function createWorkflowRun(data: WorkflowRunData) {
  const run = await db.workflowRun.create({
    data: {
      projectId: data.projectId,
      draftId: data.draftId,
      createdByUserId: data.createdByUserId,
      workflowName: data.workflowName,
      status: "RUNNING",
      input: data.input,
    },
  });

  return run;
}

/**
 * Update workflow run status and output
 */
export async function updateWorkflowRun(
  runId: string,
  updates: {
    status?: WorkflowRunStatus;
    output?: any;
    error?: string;
    snapshotRef?: string;
    endedAt?: Date;
  }
) {
  return await db.workflowRun.update({
    where: { id: runId },
    data: {
      ...(updates.status && { status: updates.status }),
      ...(updates.output && { output: updates.output }),
      ...(updates.error && { error: updates.error }),
      ...(updates.snapshotRef && { snapshotRef: updates.snapshotRef }),
      ...(updates.endedAt && { endedAt: updates.endedAt }),
      ...(updates.status === "SUCCEEDED" ||
      updates.status === "FAILED"
        ? { endedAt: new Date() }
        : {}),
    },
  });
}

/**
 * Log a workflow event
 */
export async function logWorkflowEvent(
  workflowRunId: string,
  type: "LOG" | "STEP_START" | "STEP_END" | "ERROR",
  payload: any
) {
  return await db.workflowEvent.create({
    data: {
      workflowRunId,
      type,
      payload,
    },
  });
}

