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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  itemIds: z.array(z.string()).min(1, "Select at least one item"),
});

interface Item {
  id: string;
  title: string;
  url: string;
  source: {
    title: string | null;
  };
}

interface CreateDraftDialogProps {
  projectId: string;
  projectSlug: string;
  items: Item[];
}

export function CreateDraftDialog({
  projectId,
  projectSlug,
  items,
}: CreateDraftDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      itemIds: [],
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      // Create draft
      const draftResponse = await fetch("/api/studio/drafts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          type: "NEWSLETTER",
          title: values.title,
          itemIds: values.itemIds,
        }),
      });

      if (!draftResponse.ok) {
        const error = await draftResponse.json();
        throw new Error(error.error || "Failed to create draft");
      }

      const draft = await draftResponse.json();

      toast.success("Draft created successfully");
      setIsOpen(false);
      form.reset();
      router.push(`/p/${projectSlug}/studio/drafts/${draft.id}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create draft"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Draft
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Draft</DialogTitle>
          <DialogDescription>
            Select RSS items to generate social post summaries
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="My Newsletter" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="itemIds"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Select RSS Items</FormLabel>
                  </div>
                  <ScrollArea className="h-64 rounded-md border p-4">
                    <div className="space-y-2">
                      {items.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="itemIds"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([
                                            ...(field.value || []),
                                            item.id,
                                          ])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== item.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {item.title}
                                  </label>
                                  <p className="text-xs text-muted-foreground">
                                    {item.source.title || "Unknown source"}
                                  </p>
                                </div>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Draft"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

