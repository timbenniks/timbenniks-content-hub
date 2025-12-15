"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Save, X, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface EditableSummaryProps {
  draftId: string;
  itemId: string;
  summary: string;
  onUpdate?: () => void;
}

export function EditableSummary({
  draftId,
  itemId,
  summary,
  onUpdate,
}: EditableSummaryProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState(summary);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Get current draft to update contentJson
      const draftResponse = await fetch(`/api/studio/drafts/${draftId}`);
      if (!draftResponse.ok) {
        throw new Error("Failed to fetch draft");
      }
      const draft = await draftResponse.json();

      // Update the specific summary in contentJson
      const summaries = (draft.contentJson as any)?.itemSummaries || [];
      const updatedSummaries = summaries.map((s: any) =>
        s.itemId === itemId ? { ...s, summary: editedSummary } : s
      );

      // Rebuild markdown - we need item titles from draftItems
      const draftItems = draft.draftItems || [];
      const updatedMarkdown = updatedSummaries
        .map((s: any) => {
          const draftItem = draftItems.find(
            (di: any) => di.itemId === s.itemId
          );
          const itemTitle = draftItem?.item?.title || "Item";
          const itemUrl = draftItem?.item?.url || "#";
          return `## ${itemTitle}\n\n${s.summary}\n\n[Read more](${itemUrl})`;
        })
        .join("\n\n---\n\n");

      const updateResponse = await fetch(`/api/studio/drafts/${draftId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentJson: { itemSummaries: updatedSummaries },
          contentMarkdown: updatedMarkdown,
        }),
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.error || "Failed to update summary");
      }

      toast.success("Summary updated");
      setIsEditing(false);
      setEditedSummary(editedSummary); // Update local state
      if (onUpdate) onUpdate();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update summary"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      // Get draft and project info
      const draftResponse = await fetch(`/api/studio/drafts/${draftId}`);
      if (!draftResponse.ok) {
        throw new Error("Failed to fetch draft");
      }
      const draft = await draftResponse.json();

      // Regenerate just this one item
      const response = await fetch("/api/studio/workflows/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflowName: "newsletter-draft",
          projectId: draft.projectId,
          input: {
            projectId: draft.projectId,
            draftId,
            itemIds: [itemId], // Only regenerate this one item
            regenerateItemId: itemId, // Flag to indicate single item regeneration
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to regenerate summary");
      }

      toast.success("Regenerating summary... Check back in a moment.");
      // Status polling will handle the refresh
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to regenerate summary"
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={editedSummary}
          onChange={(e) => setEditedSummary(e.target.value)}
          rows={4}
          className="text-sm"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-3 w-3" />
                Save
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditedSummary(summary);
              setIsEditing(false);
            }}
          >
            <X className="mr-2 h-3 w-3" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="bg-muted rounded-md p-4">
        <p className="text-sm leading-relaxed">{summary}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsEditing(true)}
        >
          <Edit2 className="mr-2 h-3 w-3" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRegenerate}
          disabled={isRegenerating}
        >
          {isRegenerating ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-3 w-3" />
              Regenerate
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

