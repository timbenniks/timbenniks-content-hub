import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const addItemsSchema = z.object({
  itemIds: z.array(z.string()).min(1, "At least one item is required"),
});

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
    const data = addItemsSchema.parse(body);

    const draft = await db.contentDraft.findUnique({
      where: { id: draftId },
      include: {
        draftItems: {
          select: { itemId: true },
        },
      },
    });

    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    // Verify items belong to the project
    const items = await db.item.findMany({
      where: {
        id: { in: data.itemIds },
        projectId: draft.projectId,
      },
    });

    if (items.length !== data.itemIds.length) {
      return NextResponse.json(
        { error: "Some items not found or don't belong to this project" },
        { status: 400 }
      );
    }

    // Get existing item IDs
    const existingItemIds = new Set(draft.draftItems.map((di) => di.itemId));

    // Filter out items that are already in the draft
    const itemsToAdd = data.itemIds.filter((id) => !existingItemIds.has(id));

    if (itemsToAdd.length === 0) {
      return NextResponse.json(
        { error: "All selected items are already in this draft" },
        { status: 400 }
      );
    }

    // Add new items
    await db.draftItem.createMany({
      data: itemsToAdd.map((itemId) => ({
        draftId,
        itemId,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      itemsAdded: itemsToAdd.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error adding items to draft:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

