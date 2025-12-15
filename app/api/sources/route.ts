import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeUrl, urlToString } from "@/lib/url";
import { discoverFeedUrl, discoverAllFeeds } from "@/lib/discovery";
import { refreshSource } from "@/lib/refresh";
import { detectCloudflareFromUrl } from "@/lib/cloudflare-detection";
import { extractPageMetadata } from "@/lib/rss-builder";
import { z } from "zod";

const createSourceSchema = z.object({
  projectId: z.string(),
  siteUrl: z.string().url(),
  feedUrl: z.string().url().optional(), // Optional if provided directly
  feedType: z.enum(["NATIVE", "CUSTOM"]).optional(),
  customRSSConfig: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = createSourceSchema.parse(body);

    // Verify project exists
    const project = await db.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Normalize site URL
    const normalizedSiteUrl = normalizeUrl(data.siteUrl);
    if (!normalizedSiteUrl) {
      return NextResponse.json(
        { error: "Invalid site URL" },
        { status: 400 }
      );
    }

    const siteUrlString = urlToString(normalizedSiteUrl);

    // Check if source already exists for this project
    const existingSource = await db.source.findFirst({
      where: {
        projectId: data.projectId,
        siteUrl: siteUrlString,
      },
    });

    if (existingSource) {
      return NextResponse.json(
        { error: "Source already exists for this project" },
        { status: 400 }
      );
    }

    // Detect Cloudflare protection
    const cloudflareDetection = await detectCloudflareFromUrl(siteUrlString);

    // Determine feed type
    const feedType = data.feedType || "NATIVE";
    let feedUrl: string | null = data.feedUrl || null;
    let feedTitle: string | null = null;
    let feedDescription: string | null = null;

    if (feedType === "CUSTOM") {
      // For custom RSS, use siteUrl as feedUrl (will be generated on refresh)
      feedUrl = siteUrlString;

      // Extract page metadata (title, description) from HTML
      try {
        const metadata = await extractPageMetadata(siteUrlString);
        feedTitle = metadata.title || null;
        feedDescription = metadata.description || null;
      } catch {
        // If we can't fetch metadata now, it will be set on first refresh
      }
    } else {
      // Use provided feedUrl or discover it
      if (!feedUrl) {
        feedUrl = await discoverFeedUrl(siteUrlString);

        if (!feedUrl) {
          return NextResponse.json(
            { error: "Could not discover RSS/Atom feed from the provided URL" },
            { status: 400 }
          );
        }
      }

      // Try to fetch feed metadata immediately to get title
      try {
        const Parser = (await import("rss-parser")).default;
        const parser = new Parser({ timeout: 5000 });
        const feed = await parser.parseURL(feedUrl);
        feedTitle = feed.title || null;
        feedDescription = feed.description || null;
      } catch {
        // If we can't fetch metadata now, it will be set on first refresh
      }
    }

    // Create source
    const source = await db.source.create({
      data: {
        projectId: data.projectId,
        siteUrl: siteUrlString,
        feedUrl,
        title: feedTitle,
        description: feedDescription,
        status: "ACTIVE",
        feedType: feedType as "NATIVE" | "CUSTOM",
        customRSSConfig: data.customRSSConfig ? (data.customRSSConfig as any) : undefined,
        cloudflareProtected: cloudflareDetection.isProtected,
        cloudflareWarningShown: false,
        detectionMetadata: {
          confidence: cloudflareDetection.confidence,
          indicators: cloudflareDetection.indicators,
          challengeType: cloudflareDetection.challengeType,
        } as any,
      },
    });

    // Immediately refresh the source to fetch initial items
    // Don't await - let it run in background
    refreshSource(source.id).catch((error) => {
      console.error("Error refreshing source after creation:", error);
    });

    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating source:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

