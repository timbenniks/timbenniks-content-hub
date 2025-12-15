import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CreateDraftDialog } from "@/components/create-draft-dialog";
import { DraftRowActions } from "@/components/draft-row-actions";

const statusColors = {
  DRAFT: "secondary",
  NEEDS_REVIEW: "default",
  APPROVED: "default",
  FAILED: "destructive",
} as const;

export default async function StudioDraftsPage({
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
      drafts: {
        include: {
          createdBy: {
            select: {
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              draftItems: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      items: {
        take: 100,
        orderBy: { publishedAt: "desc" },
        include: {
          source: {
            select: {
              title: true,
            },
          },
        },
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
          <h2 className="text-2xl font-semibold">Drafts</h2>
          <p className="text-muted-foreground">
            Review and manage your content drafts
          </p>
        </div>
        <CreateDraftDialog
          projectId={project.id}
          projectSlug={slug}
          items={project.items.map((item) => ({
            id: item.id,
            title: item.title,
            url: item.url,
            source: {
              title: item.source.title,
            },
          }))}
        />
      </div>

      {project.drafts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No drafts yet</CardTitle>
            <CardDescription>
              Create your first content draft from RSS items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateDraftDialog
              projectId={project.id}
              projectSlug={slug}
              items={project.items.map((item) => ({
                id: item.id,
                title: item.title,
                url: item.url,
                source: {
                  title: item.source.title,
                },
              }))}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Author</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.drafts.map((draft) => (
                <TableRow key={draft.id}>
                  <TableCell className="font-medium">{draft.title}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[draft.status] as any}>
                      {draft.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{draft._count.draftItems}</TableCell>
                  <TableCell>
                    {formatDistanceToNow(draft.createdAt, { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    {draft.createdBy.name || draft.createdBy.email}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/p/${slug}/studio/drafts/${draft.id}`}>
                          View
                        </Link>
                      </Button>
                      <DraftRowActions draftId={draft.id} projectSlug={slug} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
