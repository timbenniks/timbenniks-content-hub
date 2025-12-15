"use client";

import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { FileText, Mic, Play, Zap } from "lucide-react";

interface StudioTabsProps {
  slug: string;
}

export function StudioTabs({ slug }: StudioTabsProps) {
  const pathname = usePathname();
  
  // Determine active tab from pathname
  let activeTab = "drafts";
  if (pathname.includes("/voice")) {
    activeTab = "voice";
  } else if (pathname.includes("/runs")) {
    activeTab = "runs";
  } else if (pathname.includes("/automations")) {
    activeTab = "automations";
  }

  return (
    <Tabs value={activeTab} className="w-full">
      <TabsList>
        <TabsTrigger value="drafts" asChild>
          <Link href={`/p/${slug}/studio`}>
            <FileText className="mr-2 h-4 w-4" />
            Drafts
          </Link>
        </TabsTrigger>
        <TabsTrigger value="voice" asChild>
          <Link href={`/p/${slug}/studio/voice`}>
            <Mic className="mr-2 h-4 w-4" />
            Voice
          </Link>
        </TabsTrigger>
        <TabsTrigger value="runs" asChild>
          <Link href={`/p/${slug}/studio/runs`}>
            <Play className="mr-2 h-4 w-4" />
            Runs
          </Link>
        </TabsTrigger>
        <TabsTrigger value="automations" asChild>
          <Link href={`/p/${slug}/studio/automations`}>
            <Zap className="mr-2 h-4 w-4" />
            Automations
          </Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

