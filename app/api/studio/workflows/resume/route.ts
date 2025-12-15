import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { updateWorkflowRun, logWorkflowEvent } from "@/lib/mastra/workflow-runner";
import { executeNewsletterDraftWorkflow } from "@/lib/mastra/workflow-executor";

const resumeWorkflowSchema = z.object({
  workflowRunId: z.string(),
  approve: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = resumeWorkflowSchema.parse(body);

    // Get workflow run
    const workflowRun = await db.workflowRun.findUnique({
      where: { id: data.workflowRunId },
      include: {
        draft: true,
      },
    });

    if (!workflowRun) {
      return NextResponse.json(
        { error: "Workflow run not found" },
        { status: 404 }
      );
    }

    if (workflowRun.status !== "SUSPENDED") {
      return NextResponse.json(
        { error: "Workflow is not suspended" },
        { status: 400 }
      );
    }

    if (data.approve) {
      // Resume workflow - continue execution
      await updateWorkflowRun(data.workflowRunId, {
        status: "RUNNING",
      });

      await logWorkflowEvent(data.workflowRunId, "LOG", {
        message: "Workflow resumed after approval",
      });

      // Continue workflow execution
      const snapshot = workflowRun.snapshotRef
        ? JSON.parse(workflowRun.snapshotRef)
        : null;

      if (snapshot && workflowRun.workflowName === "newsletter-draft") {
        // Update draft status to approved
        if (workflowRun.draftId) {
          await db.contentDraft.update({
            where: { id: workflowRun.draftId },
            data: {
              status: "APPROVED",
              approvedAt: new Date(),
            },
          });
        }

        await updateWorkflowRun(data.workflowRunId, {
          status: "SUCCEEDED",
          output: snapshot,
        });
      }

      return NextResponse.json({
        success: true,
        workflowRunId: data.workflowRunId,
        status: "SUCCEEDED",
      });
    } else {
      // Reject - mark as failed
      await updateWorkflowRun(data.workflowRunId, {
        status: "FAILED",
        error: "Rejected by user",
      });

      if (workflowRun.draftId) {
        await db.contentDraft.update({
          where: { id: workflowRun.draftId },
          data: {
            status: "FAILED",
          },
        });
      }

      return NextResponse.json({
        success: true,
        workflowRunId: data.workflowRunId,
        status: "FAILED",
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error resuming workflow:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

