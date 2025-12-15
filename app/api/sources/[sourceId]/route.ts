import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateSourceSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sourceId } = await params;
    const body = await request.json();
    const data = updateSourceSchema.parse(body);

    // Find the source and verify it exists
    const source = await db.source.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Update the source
    const updatedSource = await db.source.update({
      where: { id: sourceId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });

    return NextResponse.json(updatedSource);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating source:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sourceId } = await params;

    // Find the source and verify it exists
    const source = await db.source.findUnique({
      where: { id: sourceId },
      include: {
        project: true,
        _count: {
          select: {
            items: true,
          },
        },
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Verify the user has access to the project (in the future, you might want to add project ownership)
    // For now, we'll just check that the user is authenticated

    // Count items before deletion
    const itemsCount = source._count.items;

    // Explicitly delete all items first (though cascade will handle it, this ensures cleanup)
    await db.item.deleteMany({
      where: { sourceId },
    });

    // Delete the source (items are already deleted, but cascade ensures nothing is missed)
    await db.source.delete({
      where: { id: sourceId },
    });

    return NextResponse.json({
      success: true,
      itemsDeleted: itemsCount,
    });
  } catch (error) {
    console.error("Error deleting source:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

