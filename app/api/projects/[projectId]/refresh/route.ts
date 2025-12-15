import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { refreshProject } from "@/lib/refresh";

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
    const result = await refreshProject(projectId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error refreshing project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

