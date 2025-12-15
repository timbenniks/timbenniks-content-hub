"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";

interface Source {
  id: string;
  title: string | null;
  siteUrl: string;
  feedUrl: string;
  status: "ACTIVE" | "ERROR";
  lastFetchedAt: Date | null;
  lastError: string | null;
}

interface SourcesTableProps {
  sources: Source[];
  projectSlug: string;
}

export function SourcesTable({ sources, projectSlug }: SourcesTableProps) {
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const handleRefresh = async (sourceId: string) => {
    setRefreshing(sourceId);
    try {
      const response = await fetch(`/api/sources/${sourceId}/refresh`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to refresh source");
      }

      const data = await response.json();
      toast.success(
        `Source refreshed successfully. ${data.itemsAdded} new items added.`
      );
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      toast.error("Failed to refresh source");
    } finally {
      setRefreshing(null);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Site URL</TableHead>
            <TableHead>Feed URL</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Fetched</TableHead>
            <TableHead>Error</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map((source) => (
            <TableRow key={source.id}>
              <TableCell className="font-medium">
                {source.title || "-"}
              </TableCell>
              <TableCell>
                <a
                  href={source.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  {source.siteUrl}
                </a>
              </TableCell>
              <TableCell>
                <a
                  href={source.feedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm font-mono"
                >
                  {source.feedUrl}
                </a>
              </TableCell>
              <TableCell>
                <Badge
                  variant={source.status === "ACTIVE" ? "default" : "destructive"}
                >
                  {source.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {source.lastFetchedAt
                  ? formatDistanceToNow(new Date(source.lastFetchedAt), {
                      addSuffix: true,
                    })
                  : "Never"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                {source.lastError || "-"}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRefresh(source.id)}
                    disabled={refreshing === source.id}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        refreshing === source.id ? "animate-spin" : ""
                      }`}
                    />
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/p/${projectSlug}/sources/${source.id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

