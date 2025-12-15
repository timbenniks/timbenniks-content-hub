import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createWebhookSchema = z.object({
  url: z.string().url(),
  secret: z.string().optional(),
  events: z.array(z.enum(["new_items", "source_refresh"])).min(1),
  description: z.string().optional(),
  active: z.boolean().optional().default(true),
});

const updateWebhookSchema = createWebhookSchema.partial();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const webhooks = await db.webhook.findMany({
      where: { projectId },
      include: {
        deliveries: {
          take: 10,
          orderBy: { attemptedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(webhooks);
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhooks" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = createWebhookSchema.parse(body);

    const webhook = await db.webhook.create({
      data: {
        projectId,
        url: data.url,
        secret: data.secret || null,
        events: data.events,
        description: data.description || null,
        active: data.active ?? true,
      },
    });

    return NextResponse.json(webhook, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error creating webhook:", error);
    return NextResponse.json(
      { error: "Failed to create webhook" },
      { status: 500 }
    );
  }
}

