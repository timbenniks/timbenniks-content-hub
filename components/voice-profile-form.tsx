"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  styleGuide: z.string().min(1, "Style guide is required"),
  doList: z.array(z.string()),
  dontList: z.array(z.string()),
  bannedPhrases: z.array(z.string()),
});

interface VoiceProfileFormProps {
  projectId: string;
  voiceProfile: {
    id: string;
    displayName: string;
    styleGuide: string;
    doList: string[];
    dontList: string[];
    bannedPhrases: string[];
    voiceSamples: Array<{
      id: string;
      title: string;
      content: string;
      sourceUrl: string | null;
    }>;
  } | null;
}

export function VoiceProfileForm({
  projectId,
  voiceProfile,
}: VoiceProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doItem, setDoItem] = useState("");
  const [dontItem, setDontItem] = useState("");
  const [bannedPhrase, setBannedPhrase] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: voiceProfile?.displayName || "",
      styleGuide: voiceProfile?.styleGuide || "",
      doList: voiceProfile?.doList || [],
      dontList: voiceProfile?.dontList || [],
      bannedPhrases: voiceProfile?.bannedPhrases || [],
    },
  });

  const doList = form.watch("doList");
  const dontList = form.watch("dontList");
  const bannedPhrases = form.watch("bannedPhrases");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/studio/voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          ...values,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save voice profile");
      }

      toast.success("Voice profile saved successfully");
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save voice profile"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const addDoItem = () => {
    if (doItem.trim()) {
      form.setValue("doList", [...doList, doItem.trim()]);
      setDoItem("");
    }
  };

  const removeDoItem = (index: number) => {
    form.setValue(
      "doList",
      doList.filter((_, i) => i !== index)
    );
  };

  const addDontItem = () => {
    if (dontItem.trim()) {
      form.setValue("dontList", [...dontList, dontItem.trim()]);
      setDontItem("");
    }
  };

  const removeDontItem = (index: number) => {
    form.setValue(
      "dontList",
      dontList.filter((_, i) => i !== index)
    );
  };

  const addBannedPhrase = () => {
    if (bannedPhrase.trim()) {
      form.setValue("bannedPhrases", [...bannedPhrases, bannedPhrase.trim()]);
      setBannedPhrase("");
    }
  };

  const removeBannedPhrase = (index: number) => {
    form.setValue(
      "bannedPhrases",
      bannedPhrases.filter((_, i) => i !== index)
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Define the name and style guide for your voice profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="My Writing Voice" />
                  </FormControl>
                  <FormDescription>
                    A friendly name for this voice profile
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="styleGuide"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Style Guide</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={8}
                      placeholder="Write in a conversational, opinionated tone. Use short sentences. Avoid corporate jargon..."
                    />
                  </FormControl>
                  <FormDescription>
                    Describe your writing style, tone, and preferences
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Do List</CardTitle>
            <CardDescription>
              Things to include or emphasize in your writing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={doItem}
                onChange={(e) => setDoItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDoItem();
                  }
                }}
                placeholder="Add a 'do' item..."
              />
              <Button type="button" onClick={addDoItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {doList.map((item, index) => (
                <Badge key={index} variant="secondary" className="gap-2">
                  {item}
                  <button
                    type="button"
                    onClick={() => removeDoItem(index)}
                    className="hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Don't List</CardTitle>
            <CardDescription>
              Things to avoid in your writing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={dontItem}
                onChange={(e) => setDontItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDontItem();
                  }
                }}
                placeholder="Add a 'don't' item..."
              />
              <Button type="button" onClick={addDontItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {dontList.map((item, index) => (
                <Badge key={index} variant="secondary" className="gap-2">
                  {item}
                  <button
                    type="button"
                    onClick={() => removeDontItem(index)}
                    className="hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Banned Phrases</CardTitle>
            <CardDescription>
              Phrases that should never appear in generated content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={bannedPhrase}
                onChange={(e) => setBannedPhrase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addBannedPhrase();
                  }
                }}
                placeholder="Add a banned phrase..."
              />
              <Button type="button" onClick={addBannedPhrase}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {bannedPhrases.map((phrase, index) => (
                <Badge key={index} variant="destructive" className="gap-2">
                  {phrase}
                  <button
                    type="button"
                    onClick={() => removeBannedPhrase(index)}
                    className="hover:text-destructive-foreground"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Voice Profile"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

