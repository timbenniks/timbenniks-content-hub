import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { StudioTabs } from "@/components/studio-tabs";

export default async function StudioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const { slug } = await params;
  const project = await db.project.findUnique({
    where: { slug },
  });

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Content Studio</h1>
        <p className="text-muted-foreground">
          Generate social post summaries from your RSS feeds
        </p>
      </div>

      <StudioTabs slug={slug} />

      {children}
    </div>
  );
}

