"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface CloudflareWarningProps {
  confidence?: "low" | "medium" | "high";
  showTitle?: boolean;
  className?: string;
}

export function CloudflareWarning({
  confidence = "medium",
  showTitle = true,
  className,
}: CloudflareWarningProps) {
  const getSeverity = () => {
    if (confidence === "high") return "destructive";
    if (confidence === "medium") return "default";
    return "default";
  };

  return (
    <Alert variant={getSeverity()} className={className}>
      <AlertTriangle className="h-4 w-4" />
      {showTitle && <AlertTitle>Cloudflare Protection Detected</AlertTitle>}
      <AlertDescription>
        This website is protected by Cloudflare bot protection. RSS feeds may
        not work reliably, and custom RSS building may fail. Consider contacting
        the website owner or using an alternative source.
      </AlertDescription>
    </Alert>
  );
}

