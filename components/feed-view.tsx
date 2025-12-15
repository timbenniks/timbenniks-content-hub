"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeedList } from "@/components/feed-list";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState, useMemo } from "react";

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
}

export function FeedView({ items, sources }: FeedViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [filterToday, setFilterToday] = useState(false);

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
          <TabsTrigger value="all">All ({items.length})</TabsTrigger>
          {todayCount > 0 && (
            <TabsTrigger value="today">Today ({todayCount})</TabsTrigger>
          )}
          {sources.map((source) => {
            const count = items.filter(
              (item) => item.source.id === source.id
            ).length;
            return (
              <TabsTrigger key={source.id} value={source.id}>
                {source.title || "Untitled"} ({count})
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
    </div>
  );
}
