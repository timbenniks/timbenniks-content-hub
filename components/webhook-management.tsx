"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ExternalLink, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Webhook {
  id: string;
  url: string;
  secret: string | null;
  events: string[];
  active: boolean;
  description: string | null;
  createdAt: string;
  deliveries?: Array<{
    id: string;
    status: string;
    statusCode: number | null;
    attemptedAt: string;
    deliveredAt: string | null;
  }>;
}

interface WebhookManagementProps {
  projectId: string;
}

export function WebhookManagement({ projectId }: WebhookManagementProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [formData, setFormData] = useState({
    url: "",
    secret: "",
    events: [] as string[],
    description: "",
    active: true,
  });

  useEffect(() => {
    loadWebhooks();
  }, [projectId]);

  const loadWebhooks = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/webhooks`);
      
      // Handle different response statuses
      if (response.status === 404) {
        // Project not found - set empty array and don't show error
        setWebhooks([]);
        return;
      }
      
      if (!response.ok) {
        // For other errors, try to get error message but don't throw
        const errorData = await response.json().catch(() => ({}));
        console.error("Error loading webhooks:", errorData.error || "Unknown error");
        // Only show toast for actual server errors (5xx), not client errors
        if (response.status >= 500) {
          toast.error("Failed to load webhooks");
        }
        setWebhooks([]);
        return;
      }
      
      const data = await response.json();
      // Empty array is valid - no webhooks configured yet
      setWebhooks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading webhooks:", error);
      // Network errors or other exceptions
      toast.error("Failed to load webhooks");
      // Set empty array on error so UI can still render
      setWebhooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        url: formData.url,
        secret: formData.secret || undefined,
        events: formData.events,
        description: formData.description || undefined,
        active: formData.active,
      };

      const url = editingWebhook
        ? `/api/projects/${projectId}/webhooks/${editingWebhook.id}`
        : `/api/projects/${projectId}/webhooks`;

      const response = await fetch(url, {
        method: editingWebhook ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save webhook");
      }

      toast.success(
        editingWebhook ? "Webhook updated" : "Webhook created"
      );
      setIsDialogOpen(false);
      resetForm();
      loadWebhooks();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save webhook"
      );
    }
  };

  const handleDelete = async (webhookId: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/webhooks/${webhookId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete webhook");

      toast.success("Webhook deleted");
      loadWebhooks();
    } catch (error) {
      toast.error("Failed to delete webhook");
    }
  };

  const handleToggleActive = async (webhook: Webhook) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/webhooks/${webhook.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: !webhook.active }),
        }
      );

      if (!response.ok) throw new Error("Failed to update webhook");

      toast.success(
        webhook.active ? "Webhook deactivated" : "Webhook activated"
      );
      loadWebhooks();
    } catch (error) {
      toast.error("Failed to update webhook");
    }
  };

  const resetForm = () => {
    setFormData({
      url: "",
      secret: "",
      events: [],
      description: "",
      active: true,
    });
    setEditingWebhook(null);
  };

  const openEditDialog = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setFormData({
      url: webhook.url,
      secret: webhook.secret || "",
      events: webhook.events,
      description: webhook.description || "",
      active: webhook.active,
    });
    setIsDialogOpen(true);
  };

  const toggleEvent = (event: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return <Badge className="bg-green-500">Success</Badge>;
      case "FAILED":
        return <Badge className="bg-red-500">Failed</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-500">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return <div>Loading webhooks...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Webhooks</CardTitle>
            <CardDescription>
              Configure webhooks to receive notifications when new content is
              added or sources are refreshed
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingWebhook ? "Edit Webhook" : "Create Webhook"}
                </DialogTitle>
                <DialogDescription>
                  Configure a webhook URL to receive notifications
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">Webhook URL *</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) =>
                      setFormData({ ...formData, url: e.target.value })
                    }
                    placeholder="https://example.com/webhook"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secret">Secret (optional)</Label>
                  <Input
                    id="secret"
                    type="password"
                    value={formData.secret}
                    onChange={(e) =>
                      setFormData({ ...formData, secret: e.target.value })
                    }
                    placeholder="Webhook secret for signature verification"
                  />
                  <p className="text-sm text-muted-foreground">
                    If provided, webhook payloads will include an
                    X-Webhook-Signature header with HMAC-SHA256 signature
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Events *</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="event-new-items"
                        checked={formData.events.includes("new_items")}
                        onCheckedChange={() => toggleEvent("new_items")}
                      />
                      <Label
                        htmlFor="event-new-items"
                        className="font-normal cursor-pointer"
                      >
                        New Items - Fired when new items are added
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="event-source-refresh"
                        checked={formData.events.includes("source_refresh")}
                        onCheckedChange={() => toggleEvent("source_refresh")}
                      />
                      <Label
                        htmlFor="event-source-refresh"
                        className="font-normal cursor-pointer"
                      >
                        Source Refresh - Fired when a source refresh completes
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Description for this webhook"
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, active: checked })
                    }
                  />
                  <Label htmlFor="active" className="font-normal cursor-pointer">
                    Active
                  </Label>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingWebhook ? "Update" : "Create"} Webhook
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {webhooks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No webhooks configured. Click "Add Webhook" to create one.
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map((webhook) => (
              <Card key={webhook.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{webhook.url}</span>
                        {webhook.active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      {webhook.description && (
                        <p className="text-sm text-muted-foreground">
                          {webhook.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="outline">
                            {event}
                          </Badge>
                        ))}
                      </div>
                      {webhook.deliveries && webhook.deliveries.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Last delivery:{" "}
                          {getStatusBadge(webhook.deliveries[0].status)}
                          {webhook.deliveries[0].statusCode && (
                            <span className="ml-2">
                              ({webhook.deliveries[0].statusCode})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={webhook.active}
                        onCheckedChange={() => handleToggleActive(webhook)}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditDialog(webhook)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Webhook?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this webhook? This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(webhook.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

