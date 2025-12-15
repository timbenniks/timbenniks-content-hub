import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FeedView } from "@/components/feed-view";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { RefreshFeedButton } from "@/components/refresh-feed-button";
import { notFound } from "next/navigation";

export default async function FeedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const { slug } = await params;
  const project = await db.project.findUnique({
    where: { slug },
    include: {
      sources: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  const items = await db.item.findMany({
    where: { projectId: project.id },
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
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">
            Aggregated feed from {project.sources.length} source
            {project.sources.length !== 1 ? "s" : ""}
          </p>
        </div>
        <RefreshFeedButton projectId={project.id} />
      </div>

      <FeedView items={items} sources={project.sources} />
    </div>
  );
}

