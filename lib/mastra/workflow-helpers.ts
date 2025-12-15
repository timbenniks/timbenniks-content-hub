/**
 * Helper utilities for workflow execution
 * Provides DRY abstractions for common workflow patterns
 */

import { EMITTER_SYMBOL, STREAM_FORMAT_SYMBOL } from "@mastra/core/workflows/_constants";
import { Step } from "@mastra/core/workflows";
import { logWorkflowEvent, updateWorkflowRun } from "./workflow-runner";

/**
 * Creates a step execution context with all required Mastra workflow properties
 */
export function createStepContext<TInput = any>(
  workflowRunId: string,
  workflowId: string,
  input: TInput,
  options: {
    getStepResult?: () => any;
    suspend?: (payload: any) => Promise<void>;
  } = {}
) {
  const abortController = new AbortController();

  return {
    inputData: {} as any, // Will be set by caller
    state: {},
    setState: () => {},
    runId: workflowRunId,
    workflowId,
    mastra: {} as any,
    runtimeContext: {} as any,
    getInitData: () => input,
    getStepResult: options.getStepResult || (() => ({} as any)),
    suspend: options.suspend || (async () => {}),
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
    engine: "default" as const,
    abortSignal: abortController.signal,
    writer: {} as any,
  };
}

/**
 * Executes a step with automatic logging of start/end events
 */
export async function executeStepWithLogging<TInput, TOutput>(
  step: { execute: (context: any) => Promise<TOutput> },
  workflowRunId: string,
  stepName: string,
  inputData: TInput,
  context: ReturnType<typeof createStepContext>
): Promise<TOutput> {
  await logWorkflowEvent(workflowRunId, "STEP_START", { step: stepName });

  const contextWithInput = {
    ...context,
    inputData,
  };

  const result = await step.execute(contextWithInput as any);

  await logWorkflowEvent(workflowRunId, "STEP_END", {
    step: stepName,
    result,
  });

  return result;
}

/**
 * Wraps workflow execution with consistent error handling
 */
export async function withWorkflowErrorHandling<T>(
  workflowRunId: string,
  workflowFn: () => Promise<T>
): Promise<T> {
  try {
    return await workflowFn();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await updateWorkflowRun(workflowRunId, {
      status: "FAILED",
      error: errorMessage,
    });

    await logWorkflowEvent(workflowRunId, "ERROR", { error: errorMessage });

    throw error;
  }
}

/**
 * Creates a suspend handler for workflow steps
 */
export function createSuspendHandler(
  workflowRunId: string,
  onSuspend?: (payload: any) => void
) {
  return async (payload: any) => {
    await updateWorkflowRun(workflowRunId, {
      status: "SUSPENDED",
      snapshotRef: JSON.stringify(payload),
    });

    await logWorkflowEvent(workflowRunId, "LOG", {
      message: "Workflow suspended for human review",
      payload,
    });

    onSuspend?.(payload);
  };
}

