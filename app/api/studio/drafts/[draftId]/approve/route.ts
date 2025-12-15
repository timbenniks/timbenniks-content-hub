import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { draftId } = await params;
    const body = await request.json();
    const approve = body.approve !== false; // Default to true

    const draft = await db.contentDraft.findUnique({
      where: { id: draftId },
      include: {
        workflowRuns: {
          where: {
            status: "SUSPENDED",
          },
        },
      },
    });

    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    if (approve) {
      // Approve draft
      await db.contentDraft.update({
        where: { id: draftId },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
        },
      });

      // Resume any suspended workflow runs
      for (const run of draft.workflowRuns) {
        await db.workflowRun.update({
          where: { id: run.id },
          data: {
            status: "SUCCEEDED",
            endedAt: new Date(),
          },
        });
      }

      return NextResponse.json({
        success: true,
        draft: {
          ...draft,
          status: "APPROVED",
          approvedAt: new Date(),
        },
      });
    } else {
      // Reject draft
      await db.contentDraft.update({
        where: { id: draftId },
        data: {
          status: "FAILED",
        },
      });

      // Mark workflow runs as failed
      for (const run of draft.workflowRuns) {
        await db.workflowRun.update({
          where: { id: run.id },
          data: {
            status: "FAILED",
            error: "Rejected by user",
            endedAt: new Date(),
          },
        });
      }

      return NextResponse.json({
        success: true,
        draft: {
          ...draft,
          status: "FAILED",
        },
      });
    }
  } catch (error) {
    console.error("Error approving draft:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

