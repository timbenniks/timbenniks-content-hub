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
import { RefreshCw, ExternalLink, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EditSourceDialog } from "@/components/edit-source-dialog";

interface Source {
  id: string;
  title: string | null;
  siteUrl: string;
  feedUrl: string;
  status: "ACTIVE" | "ERROR";
  feedType?: "NATIVE" | "CUSTOM";
  cloudflareProtected?: boolean;
  lastFetchedAt: Date | null;
  lastError: string | null;
}

interface SourcesTableProps {
  sources: Source[];
  projectSlug: string;
}

export function SourcesTable({ sources, projectSlug }: SourcesTableProps) {
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

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

  const handleDelete = async (sourceId: string, sourceTitle: string | null) => {
    setDeleting(sourceId);
    try {
      const response = await fetch(`/api/sources/${sourceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete source");
      }

      const data = await response.json();
      const itemsDeleted = data.itemsDeleted || 0;
      toast.success(
        `Source "${sourceTitle || "Untitled"}" deleted successfully.${
          itemsDeleted > 0 ? ` ${itemsDeleted} item${itemsDeleted !== 1 ? "s" : ""} removed.` : ""
        }`
      );
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      toast.error("Failed to delete source");
    } finally {
      setDeleting(null);
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
            <TableHead>Type</TableHead>
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
                <div className="flex items-center gap-2">
                  {source.title || "-"}
                  {source.cloudflareProtected && (
                    <span title="Cloudflare protected">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </span>
                  )}
                </div>
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
                <Badge variant="outline">
                  {source.feedType === "CUSTOM" ? "Custom RSS" : "Native RSS"}
                </Badge>
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
                    disabled={refreshing === source.id || deleting === source.id}
                    title="Refresh source"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        refreshing === source.id ? "animate-spin" : ""
                      }`}
                    />
                  </Button>
                  <EditSourceDialog
                    sourceId={source.id}
                    currentTitle={source.title}
                  />
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/p/${projectSlug}/sources/${source.id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deleting === source.id}
                        title="Delete source"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Source</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this source? This will
                          permanently delete the source and all its items. This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(source.id, source.title)}
                          disabled={deleting === source.id}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleting === source.id ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

