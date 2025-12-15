import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NewProjectForm } from "@/components/new-project-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container max-w-2xl space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">New Project</h1>
        <p className="text-muted-foreground">
          Create a new project to aggregate news feeds
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>
            Enter a name and optional description for your project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewProjectForm />
        </CardContent>
      </Card>
    </div>
  );
}

