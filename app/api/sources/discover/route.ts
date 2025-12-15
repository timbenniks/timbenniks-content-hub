import { NextRequest, NextResponse } from "next/server";
import { discoverAllFeeds } from "@/lib/discovery";
import { z } from "zod";

const discoverSchema = z.object({
  url: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = discoverSchema.parse(body);

    const result = await discoverAllFeeds(data.url);

    if (result.feeds.length === 0) {
      return NextResponse.json(
        {
          error: "Could not discover any RSS/Atom feeds from the provided URL",
          cloudflareProtected: result.cloudflareProtected,
          cloudflareConfidence: result.cloudflareConfidence,
          canBuildCustomRSS: true, // Offer custom RSS option when no feeds found
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      feeds: result.feeds,
      cloudflareProtected: result.cloudflareProtected,
      cloudflareConfidence: result.cloudflareConfidence,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error discovering feeds:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

