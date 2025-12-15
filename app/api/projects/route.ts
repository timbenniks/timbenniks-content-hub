import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateSlug, generateApiKey } from "@/lib/slug";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all projects (for now, no user-specific filtering)
    // In a multi-user scenario, you'd add userId to Project model
    const projects = await db.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            sources: true,
            items: true,
          },
        },
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = createProjectSchema.parse(body);

    // Generate unique slug
    let baseSlug = generateSlug(data.name);
    let slug = baseSlug;
    let counter = 1;

    // Ensure slug is unique
    while (await db.project.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Generate API key
    let apiKey = generateApiKey();
    while (await db.project.findUnique({ where: { apiKey } })) {
      apiKey = generateApiKey();
    }

    const project = await db.project.create({
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        apiKey,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

