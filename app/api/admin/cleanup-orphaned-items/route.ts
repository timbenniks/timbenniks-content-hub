import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cleanupOrphanedItems } from "@/lib/cleanup";

/**
 * Admin endpoint to clean up orphaned items
 * This removes items that reference sources that no longer exist
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await cleanupOrphanedItems();

    return NextResponse.json({
      success: true,
      itemsDeleted: result.deleted,
    });
  } catch (error) {
    console.error("Error cleaning up orphaned items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

