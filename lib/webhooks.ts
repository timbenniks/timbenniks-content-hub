/**
 * Webhook delivery system
 */

import { db } from "./db";
import crypto from "crypto";

export interface WebhookPayload {
  event: string;
  project: {
    id: string;
    name: string;
    slug: string;
  };
  timestamp: string;
  data: any;
}

/**
 * Generate webhook signature
 */
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

/**
 * Fire a single webhook
 */
async function fireWebhook(
  webhookId: string,
  payload: WebhookPayload
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const webhook = await db.webhook.findUnique({
    where: { id: webhookId },
  });

  if (!webhook || !webhook.active) {
    return { success: false, error: "Webhook not found or inactive" };
  }

  // Check if webhook subscribes to this event
  if (!webhook.events.includes(payload.event)) {
    return { success: false, error: "Webhook does not subscribe to this event" };
  }

  const payloadString = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "News-Aggregator-Webhook/1.0",
  };

  // Add signature if secret is configured
  if (webhook.secret) {
    const signature = generateSignature(payloadString, webhook.secret);
    headers["X-Webhook-Signature"] = `sha256=${signature}`;
  }

  // Create delivery record
  const delivery = await db.webhookDelivery.create({
    data: {
      webhookId: webhook.id,
      event: payload.event,
      status: "PENDING",
      payload: payload as any,
    },
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text().catch(() => "");

    // Update delivery record
    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: response.ok ? "SUCCESS" : "FAILED",
        statusCode: response.status,
        response: responseText.substring(0, 1000), // Limit response size
        deliveredAt: response.ok ? new Date() : null,
        error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`,
      },
    });

    return {
      success: response.ok,
      statusCode: response.status,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Update delivery record
    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "FAILED",
        error: errorMessage,
      },
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Fire webhooks for a project when new items are added
 */
export async function fireNewItemsWebhook(
  projectId: string,
  newItems: Array<{
    id: string;
    title: string;
    url: string;
    author?: string | null;
    publishedAt?: Date | null;
    contentSnippet?: string | null;
    source: {
      id: string;
      title: string | null;
      siteUrl: string;
    };
  }>
): Promise<void> {
  if (newItems.length === 0) {
    return; // No new items, don't fire webhooks
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, slug: true },
  });

  if (!project) {
    return;
  }

  // Get active webhooks for this project that subscribe to "new_items"
  const webhooks = await db.webhook.findMany({
    where: {
      projectId,
      active: true,
      events: {
        has: "new_items",
      },
    },
  });

  if (webhooks.length === 0) {
    return; // No webhooks configured
  }

  const payload: WebhookPayload = {
    event: "new_items",
    project: {
      id: project.id,
      name: project.name,
      slug: project.slug,
    },
    timestamp: new Date().toISOString(),
    data: {
      count: newItems.length,
      items: newItems.map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        author: item.author,
        publishedAt: item.publishedAt?.toISOString() || null,
        contentSnippet: item.contentSnippet,
        source: {
          id: item.source.id,
          title: item.source.title,
          siteUrl: item.source.siteUrl,
        },
      })),
    },
  };

  // Fire all webhooks in parallel (don't wait for them)
  Promise.allSettled(
    webhooks.map((webhook) => fireWebhook(webhook.id, payload))
  ).catch((error) => {
    console.error("Error firing webhooks:", error);
    // Don't throw - webhook failures shouldn't break the refresh process
  });
}

/**
 * Fire webhook when source refresh completes
 */
export async function fireSourceRefreshWebhook(
  projectId: string,
  sourceId: string,
  success: boolean,
  itemsAdded: number,
  error?: string
): Promise<void> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, slug: true },
  });

  if (!project) {
    return;
  }

  const source = await db.source.findUnique({
    where: { id: sourceId },
    select: { id: true, title: true, siteUrl: true },
  });

  if (!source) {
    return;
  }

  // Get active webhooks for this project that subscribe to "source_refresh"
  const webhooks = await db.webhook.findMany({
    where: {
      projectId,
      active: true,
      events: {
        has: "source_refresh",
      },
    },
  });

  if (webhooks.length === 0) {
    return;
  }

  const payload: WebhookPayload = {
    event: "source_refresh",
    project: {
      id: project.id,
      name: project.name,
      slug: project.slug,
    },
    timestamp: new Date().toISOString(),
    data: {
      source: {
        id: source.id,
        title: source.title,
        siteUrl: source.siteUrl,
      },
      success,
      itemsAdded,
      error: error || null,
    },
  };

  // Fire all webhooks in parallel
  Promise.allSettled(
    webhooks.map((webhook) => fireWebhook(webhook.id, payload))
  ).catch((error) => {
    console.error("Error firing webhooks:", error);
  });
}

