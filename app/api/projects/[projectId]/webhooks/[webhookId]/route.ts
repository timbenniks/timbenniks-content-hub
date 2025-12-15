import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  secret: z.string().optional().nullable(),
  events: z.array(z.enum(["new_items", "source_refresh"])).optional(),
  description: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; webhookId: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, webhookId } = await params;
    const webhook = await db.webhook.findUnique({
      where: { id: webhookId },
      include: {
        deliveries: {
          take: 50,
          orderBy: { attemptedAt: "desc" },
        },
      },
    });

    if (!webhook || webhook.projectId !== projectId) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    return NextResponse.json(webhook);
  } catch (error) {
    console.error("Error fetching webhook:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhook" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; webhookId: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, webhookId } = await params;
    const webhook = await db.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || webhook.projectId !== projectId) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = updateWebhookSchema.parse(body);

    const updated = await db.webhook.update({
      where: { id: webhookId },
      data: {
        ...(data.url && { url: data.url }),
        ...(data.secret !== undefined && { secret: data.secret }),
        ...(data.events && { events: data.events }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating webhook:", error);
    return NextResponse.json(
      { error: "Failed to update webhook" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; webhookId: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, webhookId } = await params;
    const webhook = await db.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || webhook.projectId !== projectId) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    await db.webhook.delete({
      where: { id: webhookId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return NextResponse.json(
      { error: "Failed to delete webhook" },
      { status: 500 }
    );
  }
}

