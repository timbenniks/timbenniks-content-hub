"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Item {
  id: string;
  title: string;
  url: string;
  source: {
    title: string | null;
  };
}

interface AddItemsDialogProps {
  draftId: string;
  projectId: string;
  existingItemIds: string[];
  availableItems: Item[];
}

export function AddItemsDialog({
  draftId,
  projectId,
  existingItemIds,
  availableItems,
}: AddItemsDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Filter out items that are already in the draft
  const availableToAdd = availableItems.filter(
    (item) => !existingItemIds.includes(item.id)
  );

  const handleSubmit = async () => {
    if (selectedItemIds.length === 0) {
      toast.error("Please select at least one item");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/studio/drafts/${draftId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemIds: selectedItemIds,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add items");
      }

      toast.success(`Added ${selectedItemIds.length} item(s) to draft`);
      setIsOpen(false);
      setSelectedItemIds([]);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add items"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (availableToAdd.length === 0) {
    return null; // No items available to add
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Items
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Items to Draft</DialogTitle>
          <DialogDescription>
            Select RSS items to add to this draft
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-64 rounded-md border p-4">
          <div className="space-y-2">
            {availableToAdd.map((item) => (
              <div
                key={item.id}
                className="flex flex-row items-start space-x-3 space-y-0"
              >
                <Checkbox
                  checked={selectedItemIds.includes(item.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedItemIds([...selectedItemIds, item.id]);
                    } else {
                      setSelectedItemIds(
                        selectedItemIds.filter((id) => id !== item.id)
                      );
                    }
                  }}
                />
                <div className="space-y-1 leading-none">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {item.title}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {item.source.title || "Unknown source"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              `Add ${selectedItemIds.length} Item(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

