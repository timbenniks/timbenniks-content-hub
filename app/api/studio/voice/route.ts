import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const voiceProfileSchema = z.object({
  projectId: z.string(),
  displayName: z.string().min(1),
  styleGuide: z.string().min(1),
  doList: z.array(z.string()),
  dontList: z.array(z.string()),
  bannedPhrases: z.array(z.string()),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = voiceProfileSchema.parse(body);

    // Verify project exists
    const project = await db.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Upsert voice profile
    const voiceProfile = await db.voiceProfile.upsert({
      where: { projectId: data.projectId },
      create: {
        projectId: data.projectId,
        displayName: data.displayName,
        styleGuide: data.styleGuide,
        doList: data.doList,
        dontList: data.dontList,
        bannedPhrases: data.bannedPhrases,
      },
      update: {
        displayName: data.displayName,
        styleGuide: data.styleGuide,
        doList: data.doList,
        dontList: data.dontList,
        bannedPhrases: data.bannedPhrases,
      },
    });

    return NextResponse.json(voiceProfile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error saving voice profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

