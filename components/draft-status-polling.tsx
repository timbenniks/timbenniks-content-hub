"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface DraftStatusPollingProps {
  draftId: string;
  status: string;
}

export function DraftStatusPolling({
  draftId,
  status: initialStatus,
}: DraftStatusPollingProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [hasContent, setHasContent] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    // Only poll if draft is in a state that might change
    if (status === "DRAFT" || status === "NEEDS_REVIEW") {
      setIsPolling(true);
    } else {
      setIsPolling(false);
    }
  }, [status]);

  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/studio/drafts/${draftId}`);
        if (!response.ok) return;

        const draft = await response.json();
        const newStatus = draft.status;
        const nowHasContent = !!(draft.contentMarkdown || draft.contentJson);

        // Refresh if status changed OR if content appeared
        if (newStatus !== status || (!hasContent && nowHasContent)) {
          console.log(`[DraftStatusPolling] Status: ${status} -> ${newStatus}, Content appeared: ${!hasContent && nowHasContent}`);
          setStatus(newStatus);
          setHasContent(nowHasContent);
          // Refresh the page to show updated content
          setTimeout(() => {
            router.refresh();
          }, 500);
        } else if (nowHasContent) {
          setHasContent(true);
        }
      } catch (error) {
        console.error("Error polling draft status:", error);
      }
    }, 2000); // Poll every 2 seconds (faster to catch completion)

    return () => clearInterval(interval);
  }, [draftId, status, isPolling, router]);

  return null; // This component doesn't render anything
}

