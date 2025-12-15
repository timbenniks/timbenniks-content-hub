import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FeedView } from "@/components/feed-view";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { RefreshFeedButton } from "@/components/refresh-feed-button";
import { notFound } from "next/navigation";

const ITEMS_PER_PAGE = 20;

export default async function FeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const { slug } = await params;
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || "1", 10));

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

  // Get total count for pagination
  const totalItems = await db.item.count({
    where: { projectId: project.id },
  });

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  // Fetch paginated items
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
    skip: (currentPage - 1) * ITEMS_PER_PAGE,
    take: ITEMS_PER_PAGE,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">
            Aggregated feed from {project.sources.length} source
            {project.sources.length !== 1 ? "s" : ""} • {totalItems} total items
          </p>
        </div>
        <RefreshFeedButton projectId={project.id} />
      </div>

      <FeedView
        items={items}
        sources={project.sources}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        projectSlug={slug}
      />
    </div>
  );
}

