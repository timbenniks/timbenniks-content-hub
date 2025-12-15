import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { refreshSource } from "@/lib/refresh";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sourceId } = await params;
    console.log(`[Refresh] Starting refresh for source: ${sourceId}`);
    
    const result = await refreshSource(sourceId);

    if (!result.success) {
      console.error(`[Refresh] Failed to refresh source ${sourceId}:`, result.error);
      return NextResponse.json(
        { error: result.error || "Failed to refresh source" },
        { status: 500 }
      );
    }

    console.log(`[Refresh] Successfully refreshed source ${sourceId}, added ${result.itemsAdded} items`);
    return NextResponse.json({
      success: true,
      itemsAdded: result.itemsAdded,
    });
  } catch (error) {
    console.error("[Refresh] Unexpected error refreshing source:", error);
    console.error("[Refresh] Error stack:", error instanceof Error ? error.stack : "No stack trace");
    console.error("[Refresh] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : "Unknown",
    });
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Internal server error",
        details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.stack : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}

