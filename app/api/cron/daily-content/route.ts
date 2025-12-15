import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createWorkflowRun } from "@/lib/mastra/workflow-runner";
import { executeNewsletterDraftWorkflow } from "@/lib/mastra/workflow-executor";

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get("x-cron-secret");
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all projects with daily newsletter enabled
    const projects = await db.project.findMany({
      where: {
        dailyNewsletterEnabled: true,
      },
      include: {
        voiceProfile: true,
        items: {
          take: 50,
          orderBy: { publishedAt: "desc" },
          where: {
            publishedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        },
      },
    });

    const results = [];

    for (const project of projects) {
      try {
        // Check if voice profile exists
        if (!project.voiceProfile) {
          console.log(
            `Skipping project ${project.id}: No voice profile configured`
          );
          continue;
        }

        // Check if there are items
        if (project.items.length === 0) {
          console.log(`Skipping project ${project.id}: No recent items`);
          continue;
        }

        // Get a system user or create a draft with first available user
        const systemUser = await db.user.findFirst();

        if (!systemUser) {
          console.log(`Skipping project ${project.id}: No users found`);
          continue;
        }

        // Create draft
        const draft = await db.contentDraft.create({
          data: {
            projectId: project.id,
            createdByUserId: systemUser.id,
            type: "NEWSLETTER", // Keep enum for now
            title: `Daily Content - ${new Date().toLocaleDateString()}`,
            status: "DRAFT",
            contentMarkdown: "",
          },
        });

        // Select items (limit based on project setting)
        const itemLimit = project.dailyNewsletterItemLimit || 10;
        const selectedItems = project.items.slice(0, itemLimit);
        const itemIds = selectedItems.map((item) => item.id);

        // Link items to draft
        await db.draftItem.createMany({
          data: itemIds.map((itemId) => ({
            draftId: draft.id,
            itemId,
          })),
        });

        // Create workflow run
        const workflowRun = await createWorkflowRun({
          projectId: project.id,
          draftId: draft.id,
          createdByUserId: systemUser.id,
          workflowName: "newsletter-draft",
          input: {
            projectId: project.id,
            draftId: draft.id,
            itemIds,
          },
        });

        // Run workflow asynchronously
        executeNewsletterDraftWorkflow(workflowRun.id, {
          projectId: project.id,
          draftId: draft.id,
          itemIds,
        }).catch((error) => {
          console.error(
            `Error executing workflow for project ${project.id}:`,
            error
          );
        });

        results.push({
          projectId: project.id,
          projectName: project.name,
          draftId: draft.id,
          workflowRunId: workflowRun.id,
          itemsSelected: itemIds.length,
          status: "started",
        });
      } catch (error) {
        console.error(`Error processing project ${project.id}:`, error);
        results.push({
          projectId: project.id,
          projectName: project.name,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      projectsProcessed: projects.length,
      draftsCreated: results.filter((r) => r.status === "started").length,
      results,
    });
  } catch (error) {
    console.error("Error in daily content cron:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

