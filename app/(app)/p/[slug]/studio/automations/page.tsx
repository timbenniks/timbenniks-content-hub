import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { AutomationsForm } from "@/components/automations-form";

export default async function StudioAutomationsPage({
  params,
}: {
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
        <h2 className="text-2xl font-semibold">Automations</h2>
        <p className="text-muted-foreground">
          Configure automated content generation
        </p>
      </div>

      <AutomationsForm project={project} />
    </div>
  );
}

