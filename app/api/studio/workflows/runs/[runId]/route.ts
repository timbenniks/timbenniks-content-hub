import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { runId } = await params;

    const workflowRun = await db.workflowRun.findUnique({
      where: { id: runId },
    });

    if (!workflowRun) {
      return NextResponse.json(
        { error: "Workflow run not found" },
        { status: 404 }
      );
    }

    // Delete workflow run (cascade will handle workflow events)
    await db.workflowRun.delete({
      where: { id: runId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting workflow run:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

