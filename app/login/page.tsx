import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginButton } from "./login-button";

export default async function LoginPage() {
  // Gracefully handle case where there's no session (user is logged out)
  let session;
  try {
    session = await auth();
  } catch (error) {
    // If auth fails (no session), continue to show login page
    session = null;
  }

  if (session) {
    redirect("/projects");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Sign in with Contentstack to access your news aggregator
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginButton />
        </CardContent>
      </Card>
    </div>
  );
}
