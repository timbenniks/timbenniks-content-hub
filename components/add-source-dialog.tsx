"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CloudflareWarning } from "@/components/cloudflare-warning";

const formSchema = z.object({
  siteUrl: z.string().url("Please enter a valid URL"),
});

interface DiscoveredFeed {
  url: string;
  title?: string;
  type?: string;
  cloudflareProtected?: boolean;
  cloudflareConfidence?: "low" | "medium" | "high";
}

interface AddSourceDialogProps {
  projectId: string;
}

export function AddSourceDialog({ projectId }: AddSourceDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discoveredFeeds, setDiscoveredFeeds] = useState<DiscoveredFeed[]>([]);
  const [selectedFeedUrl, setSelectedFeedUrl] = useState<string>("");
  const [showFeedSelection, setShowFeedSelection] = useState(false);
  const [cloudflareProtected, setCloudflareProtected] = useState(false);
  const [cloudflareConfidence, setCloudflareConfidence] = useState<"low" | "medium" | "high">("low");
  const [showCustomRSSOption, setShowCustomRSSOption] = useState(false);
  const [currentSiteUrl, setCurrentSiteUrl] = useState<string>("");
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      siteUrl: "",
    },
  });

  async function discoverFeeds(url: string) {
    setIsDiscovering(true);
    setCloudflareProtected(false);
    setShowCustomRSSOption(false);
    try {
      const response = await fetch("/api/sources/discover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if custom RSS is available
        if (data.canBuildCustomRSS) {
          setCurrentSiteUrl(url);
          setCloudflareProtected(data.cloudflareProtected || false);
          setCloudflareConfidence(data.cloudflareConfidence || "low");
          setShowCustomRSSOption(true);
          return;
        }
        throw new Error(data.error || "Failed to discover feeds");
      }

      const feeds: DiscoveredFeed[] = data.feeds || [];
      setCloudflareProtected(data.cloudflareProtected || false);
      setCloudflareConfidence(data.cloudflareConfidence || "low");

      if (feeds.length === 0) {
        setCurrentSiteUrl(url);
        setShowCustomRSSOption(true);
        return;
      }

      if (feeds.length === 1) {
        // Only one feed found, use it directly
        await createSource(url, feeds[0].url);
      } else {
        // Multiple feeds found, show selection
        setDiscoveredFeeds(feeds);
        setSelectedFeedUrl(feeds[0].url);
        setShowFeedSelection(true);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to discover feeds"
      );
    } finally {
      setIsDiscovering(false);
    }
  }

  async function createSource(
    siteUrl: string,
    feedUrl: string,
    feedType: "NATIVE" | "CUSTOM" = "NATIVE",
    customRSSConfig?: any
  ) {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/sources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          siteUrl,
          feedUrl,
          feedType,
          customRSSConfig,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add source");
      }

      toast.success("Source added successfully");
      form.reset();
      setOpen(false);
      setShowFeedSelection(false);
      setShowCustomRSSOption(false);
      setDiscoveredFeeds([]);
      setSelectedFeedUrl("");
      setCloudflareProtected(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add source"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createCustomRSSSource() {
    setIsSubmitting(true);
    try {
      // Auto-detect configuration
      const response = await fetch("/api/sources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          siteUrl: currentSiteUrl,
          feedUrl: currentSiteUrl, // Will be used as article list URL
          feedType: "CUSTOM",
          customRSSConfig: {}, // Empty config will trigger auto-detection
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create custom RSS source");
      }

      toast.success("Custom RSS source created successfully");
      form.reset();
      setOpen(false);
      setShowCustomRSSOption(false);
      setCurrentSiteUrl("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create custom RSS source"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await discoverFeeds(values.siteUrl);
  }

  function handleFeedSelection() {
    if (!selectedFeedUrl) {
      toast.error("Please select a feed");
      return;
    }
    createSource(form.getValues("siteUrl"), selectedFeedUrl, "NATIVE");
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setShowFeedSelection(false);
        setShowCustomRSSOption(false);
        setDiscoveredFeeds([]);
        setSelectedFeedUrl("");
        setCloudflareProtected(false);
        setCurrentSiteUrl("");
        form.reset();
      }
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Source
        </Button>
      </DialogTrigger>
      <DialogContent className={showFeedSelection || showCustomRSSOption ? "max-w-2xl" : ""}>
        {showCustomRSSOption ? (
          <>
            <DialogHeader>
              <DialogTitle>No RSS Feed Found</DialogTitle>
              <DialogDescription>
                No RSS/Atom feeds were found on this website. You can create a custom RSS feed by scraping the website's HTML.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {cloudflareProtected && (
                <CloudflareWarning confidence={cloudflareConfidence} />
              )}
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground mb-2">
                  We'll automatically detect the article structure and create an RSS feed from the website's content.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Website:</strong> {currentSiteUrl}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCustomRSSOption(false);
                  setCloudflareProtected(false);
                }}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                onClick={createCustomRSSSource}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Custom RSS Feed"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : !showFeedSelection ? (
          <>
            <DialogHeader>
              <DialogTitle>Add Source</DialogTitle>
              <DialogDescription>
                Enter any website URL and we'll automatically find the RSS/Atom feed
                by scanning the HTML for feed links. You can also paste a direct feed URL.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="siteUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com or https://example.com/feed"
                          {...field}
                          disabled={isDiscovering}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter any website URL (e.g., https://example.com) and we'll find the RSS feed automatically. If no feed is found, you can create a custom RSS feed.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={isDiscovering || isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isDiscovering || isSubmitting}>
                    {isDiscovering ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Discovering...
                      </>
                    ) : (
                      "Discover Feeds"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Select Feed</DialogTitle>
              <DialogDescription>
                Multiple RSS/Atom feeds were found. Please select which one you'd like to use.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <RadioGroup
                value={selectedFeedUrl}
                onValueChange={setSelectedFeedUrl}
                className="space-y-3"
              >
                {discoveredFeeds.map((feed, index) => (
                  <div
                    key={feed.url}
                    className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent"
                  >
                    <RadioGroupItem value={feed.url} id={`feed-${index}`} className="mt-1" />
                    <Label
                      htmlFor={`feed-${index}`}
                      className="flex-1 cursor-pointer space-y-1"
                    >
                      <div className="font-medium">
                        {feed.title || `Feed ${index + 1}`}
                      </div>
                      <div className="text-sm text-muted-foreground font-mono break-all">
                        {feed.url}
                      </div>
                      {feed.type && (
                        <div className="text-xs text-muted-foreground">
                          {feed.type}
                        </div>
                      )}
                      {feed.cloudflareProtected && (
                        <div className="text-xs text-orange-600 mt-1">
                          ⚠️ Cloudflare protected
                        </div>
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              {cloudflareProtected && (
                <CloudflareWarning confidence={cloudflareConfidence} className="mt-4" />
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowFeedSelection(false);
                  setDiscoveredFeeds([]);
                  setSelectedFeedUrl("");
                }}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                onClick={handleFeedSelection}
                disabled={isSubmitting || !selectedFeedUrl}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Source"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
