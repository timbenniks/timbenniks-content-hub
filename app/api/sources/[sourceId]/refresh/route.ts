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
    const result = await refreshSource(sourceId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to refresh source" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      itemsAdded: result.itemsAdded,
    });
  } catch (error) {
    console.error("Error refreshing source:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

