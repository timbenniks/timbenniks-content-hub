"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Project {
  id: string;
  dailyNewsletterEnabled: boolean;
  dailyNewsletterItemLimit: number | null;
}

interface AutomationsFormProps {
  project: Project;
}

export function AutomationsForm({ project }: AutomationsFormProps) {
  const [enabled, setEnabled] = useState(project.dailyNewsletterEnabled);
  const [itemLimit, setItemLimit] = useState(
    project.dailyNewsletterItemLimit?.toString() || "10"
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dailyNewsletterEnabled: enabled,
          dailyNewsletterItemLimit: parseInt(itemLimit) || 10,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save automation settings");
      }

      toast.success("Automation settings saved successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Content Automation</CardTitle>
        <CardDescription>
          Automatically generate content drafts every day from your RSS feeds
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="daily-automation">Enable Daily Automation</Label>
            <p className="text-sm text-muted-foreground">
              When enabled, a content draft will be created automatically each
              day
            </p>
          </div>
          <Switch
            id="daily-automation"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {enabled && (
          <div className="space-y-2">
            <Label htmlFor="item-limit">Maximum Items per Draft</Label>
            <Input
              id="item-limit"
              type="number"
              min="1"
              max="50"
              value={itemLimit}
              onChange={(e) => setItemLimit(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              The maximum number of RSS items to include in each automated draft
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

