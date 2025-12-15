"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Copy, RefreshCw, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WebhookManagement } from "@/components/webhook-management";

interface Project {
  id: string;
  name: string;
  slug: string;
  apiKey: string;
}

interface ProjectSettingsProps {
  project: Project;
}

export function ProjectSettings({ project }: ProjectSettingsProps) {
  const [apiKey, setApiKey] = useState(project.apiKey);
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";
  const apiUrl = `${baseUrl}/api/p/${project.slug}/items`;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleRegenerateKey = async () => {
    setIsRegenerating(true);
    try {
      const response = await fetch(
        `/api/projects/${project.id}/regenerate-key`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to regenerate API key");
      }

      const data = await response.json();
      setApiKey(data.apiKey);
      toast.success("API key regenerated successfully");
    } catch (error) {
      toast.error("Failed to regenerate API key");
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Endpoint</CardTitle>
          <CardDescription>
            Use this endpoint to fetch items from this project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Endpoint URL</Label>
            <div className="flex gap-2">
              <Input value={apiUrl} readOnly className="font-mono text-sm" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(apiUrl, "Endpoint URL")}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy endpoint URL</TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <Input
                value={apiKey}
                readOnly
                type="password"
                className="font-mono text-sm"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(apiKey, "API key")}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy API key</TooltipContent>
              </Tooltip>
            </div>
            <p className="text-sm text-muted-foreground">
              Include this key in the <code className="text-xs">x-project-key</code> header or as{" "}
              <code className="text-xs">?apiKey=</code> query parameter
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isRegenerating}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate API Key
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Regenerate API Key?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will invalidate your current API key and generate a new
                  one. Any applications using the current key will need to be
                  updated. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRegenerateKey}>
                  Regenerate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <WebhookManagement projectId={project.id} />
    </div>
  );
}

