import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createDraftSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1),
  itemIds: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const drafts = await db.contentDraft.findMany({
      where: { projectId },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            draftItems: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(drafts);
  } catch (error) {
    console.error("Error fetching drafts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = createDraftSchema.parse(body);

    // Verify project exists
    const project = await db.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Create draft
    const draft = await db.contentDraft.create({
      data: {
        projectId: data.projectId,
        createdByUserId: user.id,
        type: "NEWSLETTER", // Keep enum for now, but always use NEWSLETTER
        title: data.title,
        status: "DRAFT",
        contentMarkdown: "",
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Add items if provided
    if (data.itemIds && data.itemIds.length > 0) {
      // Verify items belong to the project
      const items = await db.item.findMany({
        where: {
          id: { in: data.itemIds },
          projectId: data.projectId,
        },
      });

      if (items.length !== data.itemIds.length) {
        return NextResponse.json(
          { error: "Some items not found or don't belong to this project" },
          { status: 400 }
        );
      }

      await db.draftItem.createMany({
        data: items.map((item) => ({
          draftId: draft.id,
          itemId: item.id,
        })),
      });
    }

    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating draft:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

