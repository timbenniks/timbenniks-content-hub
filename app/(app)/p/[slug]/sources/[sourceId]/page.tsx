import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FeedList } from "@/components/feed-list";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { RefreshSourceButton } from "@/components/refresh-source-button";
import { notFound } from "next/navigation";

export default async function SourceFeedPage({
  params,
}: {
  params: Promise<{ slug: string; sourceId: string }>;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const { slug, sourceId } = await params;
  const project = await db.project.findUnique({
    where: { slug },
  });

  if (!project) {
    notFound();
  }

  const source = await db.source.findUnique({
    where: { id: sourceId },
  });

  if (!source || source.projectId !== project.id) {
    notFound();
  }

  const items = await db.item.findMany({
    where: {
      projectId: project.id,
      sourceId: source.id,
    },
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
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {source.title || "Untitled Source"}
          </h1>
          <p className="text-muted-foreground">
            Feed URL: <a href={source.feedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono">{source.feedUrl}</a>
          </p>
        </div>
        <RefreshSourceButton sourceId={source.id} />
      </div>

      <FeedList items={items} />
    </div>
  );
}

