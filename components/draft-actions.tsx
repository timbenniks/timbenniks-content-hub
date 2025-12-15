"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DraftActionsProps {
  draftId: string;
  projectId: string;
  status: string;
  itemIds: string[];
}

export function DraftActions({
  draftId,
  projectId,
  status,
  itemIds,
}: DraftActionsProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const handleGenerate = async () => {
    if (itemIds.length === 0) {
      toast.error("Please select at least one RSS item for this draft");
      return;
    }

    setIsGenerating(true);
    try {
      console.log("[DraftActions] Starting workflow generation", {
        draftId,
        projectId,
        itemIds,
      });

      // Run content draft workflow
      const response = await fetch("/api/studio/workflows/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflowName: "newsletter-draft",
          projectId,
          draftId,
          input: {
            projectId,
            draftId,
            itemIds,
          },
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error("[DraftActions] Workflow API error:", responseData);
        throw new Error(responseData.error || "Failed to generate content");
      }

      console.log("[DraftActions] Workflow started:", responseData);
      toast.success("Content generation started. Watch the logs below for progress.");
      
      // Refresh after a short delay to allow workflow run to be created
      setTimeout(() => {
        router.refresh();
      }, 500);
    } catch (error) {
      console.error("[DraftActions] Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate content"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async (approve: boolean) => {
    setIsApproving(true);
    try {
      const response = await fetch(`/api/studio/drafts/${draftId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ approve }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update draft");
      }

      toast.success(approve ? "Draft approved" : "Draft rejected");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update draft"
      );
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {status === "DRAFT" && (
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate with AI
            </>
          )}
        </Button>
      )}
      {status === "NEEDS_REVIEW" && (
        <>
          <Button onClick={() => handleApprove(true)} disabled={isApproving}>
            {isApproving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Approve
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleApprove(false)}
            disabled={isApproving}
          >
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </>
      )}
    </div>
  );
}

