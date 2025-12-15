import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateApiKey } from "@/lib/slug";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    // Generate new API key
    let apiKey = generateApiKey();
    while (await db.project.findUnique({ where: { apiKey } })) {
      apiKey = generateApiKey();
    }

    const project = await db.project.update({
      where: { id: projectId },
      data: { apiKey },
    });

    return NextResponse.json({ apiKey: project.apiKey });
  } catch (error) {
    console.error("Error regenerating API key:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

