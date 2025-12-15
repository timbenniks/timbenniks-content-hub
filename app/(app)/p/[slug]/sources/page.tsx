import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SourcesTable } from "@/components/sources-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddSourceDialog } from "@/components/add-source-dialog";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SourcesPage({
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
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sources</h1>
          <p className="text-muted-foreground">
            Manage RSS/Atom feed sources for {project.name}
          </p>
        </div>
        <AddSourceDialog projectId={project.id} />
      </div>

      {project.sources.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No sources yet</CardTitle>
            <CardDescription>
              Add your first RSS/Atom feed source to start aggregating news
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddSourceDialog projectId={project.id} />
          </CardContent>
        </Card>
      ) : (
        <SourcesTable sources={project.sources} projectSlug={project.slug} />
      )}
    </div>
  );
}

