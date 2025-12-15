import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { refreshProject } from "@/lib/refresh";

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get("x-cron-secret");
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all projects
    const projects = await db.project.findMany({
      select: { id: true },
    });

    const results = await Promise.allSettled(
      projects.map((project) => refreshProject(project.id))
    );

    const summary = {
      projectsProcessed: projects.length,
      projectsSucceeded: 0,
      projectsFailed: 0,
      totalSourcesProcessed: 0,
      totalSourcesSucceeded: 0,
      totalSourcesFailed: 0,
      totalItemsAdded: 0,
      errors: [] as string[],
    };

    for (const result of results) {
      if (result.status === "fulfilled") {
        summary.projectsSucceeded++;
        summary.totalSourcesProcessed += result.value.sourcesProcessed;
        summary.totalSourcesSucceeded += result.value.sourcesSucceeded;
        summary.totalSourcesFailed += result.value.sourcesFailed;
        summary.totalItemsAdded += result.value.totalItemsAdded;
      } else {
        summary.projectsFailed++;
        summary.errors.push(
          result.reason?.message || "Unknown error"
        );
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (error) {
    console.error("Error in daily refresh cron:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

