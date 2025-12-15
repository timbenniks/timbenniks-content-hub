import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { draftId } = await params;

    // Get the draft to verify it exists
    const draft = await db.contentDraft.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    // Get the latest workflow run for this draft
    const workflowRun = await db.workflowRun.findFirst({
      where: { draftId },
      orderBy: { startedAt: "desc" },
      include: {
        events: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!workflowRun) {
      return NextResponse.json({
        workflowRun: null,
        events: [],
      });
    }

    return NextResponse.json({
      workflowRun: {
        id: workflowRun.id,
        status: workflowRun.status,
        startedAt: workflowRun.startedAt,
        endedAt: workflowRun.endedAt,
        error: workflowRun.error,
      },
      events: workflowRun.events.map((event) => ({
        id: event.id,
        type: event.type,
        payload: event.payload,
        createdAt: event.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching workflow events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

