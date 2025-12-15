import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    // Get API key from header or query parameter
    const apiKey =
      request.headers.get("x-project-key") ||
      request.nextUrl.searchParams.get("apiKey");

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key required. Provide via x-project-key header or ?apiKey= query parameter" },
        { status: 401 }
      );
    }

    // Find project by slug and verify API key
    const project = await db.project.findUnique({
      where: { slug },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.apiKey !== apiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Get query parameters
    const limit = parseInt(
      request.nextUrl.searchParams.get("limit") || "50",
      10
    );
    const since = request.nextUrl.searchParams.get("since");

    // Build query
    const where: any = { projectId: project.id };
    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        where.publishedAt = { gte: sinceDate };
      }
    }

    const items = await db.item.findMany({
      where,
      include: {
        source: {
          select: {
            id: true,
            title: true,
            siteUrl: true,
          },
        },
      },
      orderBy: { publishedAt: "desc" },
      take: Math.min(limit, 100), // Cap at 100
    });

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
      },
      generatedAt: new Date().toISOString(),
      items: items.map((item) => ({
        id: item.id,
        guid: item.guid,
        url: item.url,
        title: item.title,
        author: item.author,
        publishedAt: item.publishedAt?.toISOString() || null,
        contentSnippet: item.contentSnippet,
        contentHtml: item.contentHtml,
        source: {
          id: item.source.id,
          title: item.source.title,
          siteUrl: item.source.siteUrl,
        },
      })),
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

