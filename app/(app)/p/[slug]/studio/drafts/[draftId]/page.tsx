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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { DraftActions } from "@/components/draft-actions";
import { DeleteDraftButton } from "@/components/delete-draft-button";
import { EditableSummary } from "@/components/editable-summary";
import { AddItemsDialog } from "@/components/add-items-dialog";
import { DraftStatusPolling } from "@/components/draft-status-polling";
import { WorkflowLogs } from "@/components/workflow-logs";

const statusColors = {
  DRAFT: "secondary",
  NEEDS_REVIEW: "default",
  APPROVED: "default",
  FAILED: "destructive",
} as const;

export default async function DraftDetailPage({
  params,
}: {
  params: Promise<{ slug: string; draftId: string }>;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const { slug, draftId } = await params;
  const project = await db.project.findUnique({
    where: { slug },
  });

  if (!project) {
    notFound();
  }

  const draft = await db.contentDraft.findUnique({
    where: { id: draftId },
    include: {
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
      draftItems: {
        include: {
          item: {
            include: {
              source: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Get available items for adding to draft
  const availableItems = await db.item.findMany({
    where: {
      projectId: project.id,
      id: {
        notIn: draft?.draftItems.map((di) => di.itemId) || [],
      },
    },
    take: 100,
    orderBy: { publishedAt: "desc" },
    include: {
      source: {
        select: {
          title: true,
        },
      },
    },
  });

  if (!draft || draft.projectId !== project.id) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/p/${slug}/studio`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-semibold">{draft.title}</h2>
            <p className="text-muted-foreground">
              Created {new Date(draft.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusColors[draft.status] as any}>
            {draft.status.replace("_", " ")}
          </Badge>
          <DraftActions
            draftId={draft.id}
            projectId={project.id}
            status={draft.status}
            itemIds={draft.draftItems.map((di) => di.itemId)}
          />
          <DeleteDraftButton draftId={draft.id} projectSlug={slug} />
        </div>
      </div>

      <DraftStatusPolling draftId={draft.id} status={draft.status} />

      <WorkflowLogs draftId={draft.id} />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Social Post Summaries</CardTitle>
                <CardDescription>
                  {draft.draftItems.length} item(s) with generated summaries
                </CardDescription>
              </div>
              <AddItemsDialog
                draftId={draft.id}
                projectId={project.id}
                existingItemIds={draft.draftItems.map((di) => di.itemId)}
                availableItems={availableItems.map((item) => ({
                  id: item.id,
                  title: item.title,
                  url: item.url || "",
                  source: {
                    title: item.source.title,
                  },
                }))}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {draft.draftItems.map((draftItem) => {
                // Find summary for this item
                const summaries = (draft.contentJson as any)?.itemSummaries || [];
                const summary = summaries.find(
                  (s: any) => s.itemId === draftItem.itemId
                );

                return (
                  <div
                    key={draftItem.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-lg">
                          {draftItem.item.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {draftItem.item.source.title || "Unknown source"}
                        </p>
                      </div>
                      {draftItem.item.url && (
                        <a
                          href={draftItem.item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1 shrink-0 ml-4"
                        >
                          Source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    {summary?.summary && (
                      <EditableSummary
                        draftId={draft.id}
                        itemId={draftItem.itemId}
                        summary={summary.summary}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {draft.contentMarkdown && (
          <Card>
            <CardHeader>
              <CardTitle>Combined Content</CardTitle>
              <CardDescription>
                All summaries combined for easy copying
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="editor" className="w-full">
                <TabsList>
                  <TabsTrigger value="editor">Markdown</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="editor" className="mt-4">
                  <Textarea
                    value={draft.contentMarkdown}
                    readOnly
                    rows={20}
                    className="font-mono text-sm"
                  />
                </TabsContent>
                <TabsContent value="preview" className="mt-4">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown
                      components={{
                        p: ({ node, children, ...props }: any) => {
                          // Check if paragraph only contains a single link
                          const hasOnlyLink =
                            node &&
                            node.children?.length === 1 &&
                            node.children[0]?.type === "element" &&
                            node.children[0]?.tagName === "a";
                          
                          if (hasOnlyLink) {
                            return (
                              <p {...props} className="mt-4 mb-4">
                                {children}
                              </p>
                            );
                          }
                          return <p {...props}>{children}</p>;
                        },
                        a: ({ node, ...props }: any) => (
                          <a
                            {...props}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          />
                        ),
                      }}
                    >
                      {draft.contentMarkdown}
                    </ReactMarkdown>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

