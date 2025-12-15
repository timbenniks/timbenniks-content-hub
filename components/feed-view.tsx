"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeedList } from "@/components/feed-list";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

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

interface Source {
  id: string;
  title: string | null;
}

interface FeedViewProps {
  items: Item[];
  sources: Source[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  projectSlug: string;
}

export function FeedView({
  items,
  sources,
  currentPage,
  totalPages,
  totalItems,
  projectSlug,
}: FeedViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(
    null
  );
  const [filterToday, setFilterToday] = useState(false);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage === 1) {
      params.delete("page");
    } else {
      params.set("page", newPage.toString());
    }
    router.push(`/p/${projectSlug}/feed?${params.toString()}`);
  };

  // Helper function to check if a date is today
  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    const itemDate = new Date(date);
    return (
      itemDate.getDate() === today.getDate() &&
      itemDate.getMonth() === today.getMonth() &&
      itemDate.getFullYear() === today.getFullYear()
    );
  };

  const filteredItems = useMemo(() => {
    let filtered = items;

    // Filter by "today" first
    if (filterToday) {
      filtered = filtered.filter((item) => isToday(item.publishedAt));
    }

    // Filter by source
    if (selectedSourceId) {
      filtered = filtered.filter((item) => item.source.id === selectedSourceId);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.contentSnippet?.toLowerCase().includes(query) ||
          item.author?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [items, selectedSourceId, searchQuery, filterToday]);

  // Count items posted today
  const todayCount = items.filter((item) => isToday(item.publishedAt)).length;

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs
        value={filterToday ? "today" : selectedSourceId || "all"}
        onValueChange={(value) => {
          if (value === "today") {
            setFilterToday(true);
            setSelectedSourceId(null);
          } else {
            setFilterToday(false);
            setSelectedSourceId(value === "all" ? null : value);
          }
        }}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="all">All ({totalItems})</TabsTrigger>
          {todayCount > 0 && (
            <TabsTrigger value="today">Today ({todayCount})</TabsTrigger>
          )}
          {sources.map((source) => {
            // Count is approximate based on current page items
            // For accurate counts, we'd need to fetch per-source counts from the server
            const count = items.filter(
              (item) => item.source.id === source.id
            ).length;
            return (
              <TabsTrigger key={source.id} value={source.id}>
                {source.title || "Untitled"} ({count > 0 ? `${count}+` : "0"})
              </TabsTrigger>
            );
          })}
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <FeedList items={filteredItems} />
        </TabsContent>
        {todayCount > 0 && (
          <TabsContent value="today" className="mt-4">
            <FeedList items={filteredItems} />
          </TabsContent>
        )}
        {sources.map((source) => (
          <TabsContent key={source.id} value={source.id} className="mt-4">
            <FeedList items={filteredItems} />
          </TabsContent>
        ))}
      </Tabs>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * 20 + 1} to{" "}
            {Math.min(currentPage * 20, totalItems)} of {totalItems} items
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="min-w-[2.5rem]"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
