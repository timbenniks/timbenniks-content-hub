import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeUrl, urlToString } from "@/lib/url";
import { discoverFeedUrl } from "@/lib/discovery";
import { refreshSource } from "@/lib/refresh";
import { z } from "zod";

const createSourceSchema = z.object({
  projectId: z.string(),
  siteUrl: z.string().url(),
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

    // Discover feed URL
    const feedUrl = await discoverFeedUrl(siteUrlString);

    if (!feedUrl) {
      return NextResponse.json(
        { error: "Could not discover RSS/Atom feed from the provided URL" },
        { status: 400 }
      );
    }

    // Create source
    const source = await db.source.create({
      data: {
        projectId: data.projectId,
        siteUrl: siteUrlString,
        feedUrl,
        status: "ACTIVE",
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

