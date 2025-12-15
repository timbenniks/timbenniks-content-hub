"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface RefreshSourceButtonProps {
  sourceId: string;
}

export function RefreshSourceButton({ sourceId }: RefreshSourceButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/sources/${sourceId}/refresh`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to refresh source");
      }

      const data = await response.json();
      toast.success(`${data.itemsAdded} new items added.`);
      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast.error("Failed to refresh source");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button onClick={handleRefresh} disabled={isRefreshing}>
      <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
      Refresh
    </Button>
  );
}

