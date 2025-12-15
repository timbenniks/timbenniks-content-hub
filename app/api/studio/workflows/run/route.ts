import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { createWorkflowRun } from "@/lib/mastra/workflow-runner";
import { executeWorkflow, WorkflowName } from "@/lib/mastra/workflow-dispatcher";

const runWorkflowSchema = z.object({
  workflowName: z.enum(["curate-items", "newsletter-draft"]), // newsletter-draft kept for backward compatibility
  projectId: z.string(),
  draftId: z.string().optional(),
  input: z.record(z.string(), z.unknown()),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = runWorkflowSchema.parse(body);

    // Verify project exists
    const project = await db.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Create workflow run record
    const workflowRun = await createWorkflowRun({
      projectId: data.projectId,
      draftId: data.draftId,
      createdByUserId: user.id,
      workflowName: data.workflowName,
      input: data.input,
    });

    // Run workflow asynchronously
    (async () => {
      try {
        console.log(`[Workflow] Starting ${data.workflowName} workflow run ${workflowRun.id}`);
        await executeWorkflow(
          data.workflowName as WorkflowName,
          workflowRun.id,
          data.input as any
        );
        console.log(`[Workflow] Completed ${data.workflowName} workflow run ${workflowRun.id}`);
      } catch (error) {
        console.error(`[Workflow] ${workflowRun.id} failed:`, error);
        // Ensure error is logged to workflow run (workflow executor also handles this, but this is a safety net)
        await db.workflowRun.update({
          where: { id: workflowRun.id },
          data: {
            status: "FAILED",
            error: error instanceof Error ? error.message : String(error),
            endedAt: new Date(),
          },
        });
      }
    })();

    return NextResponse.json({
      workflowRunId: workflowRun.id,
      status: "RUNNING",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error running workflow:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

