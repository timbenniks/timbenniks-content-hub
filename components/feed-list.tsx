"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

interface Item {
  id: string;
  title: string;
  url: string;
  author: string | null;
  publishedAt: Date | null;
  contentSnippet: string | null;
  source: {
    id: string;
    title: string | null;
    siteUrl: string;
  };
}

interface FeedListProps {
  items: Item[];
}

export function FeedList({ items }: FeedListProps) {
  if (items.length === 0) {
    return (
      <Alert>
        <AlertDescription>No items found.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg">
                  <Link
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {item.title}
                  </Link>
                </CardTitle>
                <CardDescription className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary">
                    {item.source.title || "Untitled Source"}
                  </Badge>
                  {item.publishedAt && (
                    <span className="text-xs">
                      {formatDistanceToNow(new Date(item.publishedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                  {item.author && (
                    <span className="text-xs">by {item.author}</span>
                  )}
                </CardDescription>
              </div>
              <Link
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </CardHeader>
          {item.contentSnippet && (
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {item.contentSnippet}
              </p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

