"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface WorkflowEvent {
  id: string;
  type: "LOG" | "STEP_START" | "STEP_END" | "ERROR";
  payload: any;
  createdAt: string;
}

interface WorkflowRun {
  id: string;
  status: "RUNNING" | "SUSPENDED" | "SUCCEEDED" | "FAILED";
  startedAt: string;
  endedAt?: string | null;
  error?: string | null;
}

interface WorkflowLogsProps {
  draftId: string;
}

export function WorkflowLogs({ draftId }: WorkflowLogsProps) {
  const router = useRouter();
  const [workflowRun, setWorkflowRun] = useState<WorkflowRun | null>(null);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const fetchEvents = async () => {
    try {
      const response = await fetch(
        `/api/studio/drafts/${draftId}/workflow-events`
      );
      if (!response.ok) return;

      const data = await response.json();
      setWorkflowRun(data.workflowRun);
      setEvents(data.events || []);

      // Auto-scroll to bottom when new events arrive
      if (scrollAreaRef.current) {
        const scrollContainer =
          scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    } catch (error) {
      console.error("Error fetching workflow events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    // Poll for updates - continue polling even after completion to catch final state
    const interval = setInterval(() => {
      // Poll more frequently while running, less frequently after completion
      if (!workflowRun || workflowRun.status === "RUNNING" || workflowRun.status === "SUSPENDED") {
        fetchEvents();
      } else if (workflowRun.status === "SUCCEEDED" || workflowRun.status === "FAILED") {
        // Still poll occasionally after completion to ensure we have latest data
        // But less frequently
        const shouldPoll = Math.random() < 0.1; // 10% chance each interval
        if (shouldPoll) {
          fetchEvents();
        }
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [draftId]);

  // Refresh page when workflow completes
  useEffect(() => {
    if (
      workflowRun &&
      previousStatus &&
      previousStatus === "RUNNING" &&
      (workflowRun.status === "SUCCEEDED" || workflowRun.status === "FAILED")
    ) {
      // Workflow just completed - refresh page to show results
      console.log("[WorkflowLogs] Workflow completed, refreshing page...");
      setTimeout(() => {
        router.refresh();
      }, 1500); // Give a moment for database to update
    }
    if (workflowRun) {
      setPreviousStatus(workflowRun.status);
    }
  }, [workflowRun?.status, previousStatus, router]);

  // Always show the component, even if no workflow run exists yet
  // This allows users to see it appear when generation starts

  const getStatusIcon = () => {
    switch (workflowRun?.status) {
      case "RUNNING":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "SUCCEEDED":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "SUSPENDED":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Play className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (workflowRun?.status) {
      case "RUNNING":
        return "default";
      case "SUCCEEDED":
        return "default";
      case "FAILED":
        return "destructive";
      case "SUSPENDED":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const formatEventMessage = (event: WorkflowEvent): string => {
    const { type, payload } = event;

    switch (type) {
      case "STEP_START":
        return `▶ Starting step: ${payload.step || "unknown"}`;
      case "STEP_END":
        return `✓ Completed step: ${payload.step || "unknown"}`;
      case "LOG":
        return payload.message || JSON.stringify(payload);
      case "ERROR":
        return `✗ Error: ${payload.message || payload.error || JSON.stringify(payload)}`;
      default:
        return JSON.stringify(payload);
    }
  };

  const getEventIcon = (type: WorkflowEvent["type"]) => {
    switch (type) {
      case "STEP_START":
        return <Play className="h-3 w-3 text-blue-500" />;
      case "STEP_END":
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case "ERROR":
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return <div className="h-3 w-3 rounded-full bg-gray-400" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {workflowRun ? getStatusIcon() : <Play className="h-4 w-4 text-gray-500" />}
            <CardTitle>Workflow Logs</CardTitle>
          </div>
          {workflowRun ? (
            <Badge variant={getStatusColor() as any}>
              {workflowRun.status}
            </Badge>
          ) : (
            <Badge variant="secondary">Waiting</Badge>
          )}
        </div>
        <CardDescription>
          {workflowRun
            ? `Started ${formatDistanceToNow(new Date(workflowRun.startedAt), {
                addSuffix: true,
              })}`
            : "Click 'Generate with AI' to start workflow execution"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {workflowRun?.error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <strong>Error:</strong> {workflowRun.error}
          </div>
        )}

        {isLoading && !workflowRun ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
            Loading workflow status...
          </div>
        ) : events.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {workflowRun
              ? "Waiting for workflow events..."
              : "No events yet. Start generation to see logs."}
          </div>
        ) : (
          <ScrollArea className="h-[300px] w-full" ref={scrollAreaRef}>
            <div className="space-y-2 font-mono text-xs">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-2 rounded-md bg-muted/50 p-2"
                >
                  <div className="mt-0.5 shrink-0">
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-muted-foreground">
                        [{event.type}]
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(event.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <div className="text-sm">{formatEventMessage(event)}</div>
                    {event.payload.step && event.type === "STEP_END" && (
                      <div className="text-xs text-muted-foreground">
                        Duration:{" "}
                        {event.payload.duration
                          ? `${event.payload.duration}ms`
                          : "N/A"}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

