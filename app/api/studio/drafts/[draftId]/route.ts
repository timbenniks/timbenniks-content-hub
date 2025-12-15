import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateDraftSchema = z.object({
  title: z.string().optional(),
  contentMarkdown: z.string().optional(),
  contentJson: z.record(z.string(), z.unknown()).optional(),
});

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

    const draft = await db.contentDraft.findUnique({
      where: { id: draftId },
      include: {
        draftItems: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    return NextResponse.json(draft);
  } catch (error) {
    console.error("Error fetching draft:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const data = updateDraftSchema.parse(body);

    const draft = await db.contentDraft.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (data.title) updateData.title = data.title;
    if (data.contentMarkdown) updateData.contentMarkdown = data.contentMarkdown;
    if (data.contentJson) updateData.contentJson = data.contentJson as any;

    const updatedDraft = await db.contentDraft.update({
      where: { id: draftId },
      data: updateData,
    });

    return NextResponse.json(updatedDraft);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating draft:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { draftId } = await params;

    const draft = await db.contentDraft.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    await db.contentDraft.delete({
      where: { id: draftId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting draft:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
