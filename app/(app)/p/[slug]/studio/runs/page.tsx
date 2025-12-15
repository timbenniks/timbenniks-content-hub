import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
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
import { formatDistanceToNow } from "date-fns";
import { WorkflowRunRowActions } from "@/components/workflow-run-row-actions";

const statusColors = {
  RUNNING: "default",
  SUSPENDED: "secondary",
  SUCCEEDED: "default",
  FAILED: "destructive",
} as const;

export default async function StudioRunsPage({
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
      workflowRuns: {
        include: {
          createdBy: {
            select: {
              name: true,
              email: true,
            },
          },
          draft: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { startedAt: "desc" },
        take: 50,
      },
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Workflow Runs</h2>
        <p className="text-muted-foreground">
          Monitor workflow execution and debug issues
        </p>
      </div>

      {project.workflowRuns.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No workflow runs yet</CardTitle>
            <CardDescription>
              Workflow runs will appear here when you generate content
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Draft</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Author</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.workflowRuns.map((run) => {
                const duration = run.endedAt
                  ? `${Math.round(
                      (run.endedAt.getTime() - run.startedAt.getTime()) / 1000
                    )}s`
                  : "Running...";

                return (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">
                      {run.workflowName}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[run.status] as any}>
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {run.draft ? (
                        <span className="text-sm">{run.draft.title}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(run.startedAt, { addSuffix: true })}
                    </TableCell>
                    <TableCell>{duration}</TableCell>
                    <TableCell>
                      {run.createdBy.name || run.createdBy.email}
                    </TableCell>
                    <TableCell className="text-right">
                      <WorkflowRunRowActions runId={run.id} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

