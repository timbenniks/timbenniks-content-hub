import { auth } from "./auth";
import { redirect } from "next/navigation";

/**
 * Get the current session on the server
 * Re-exported from auth.ts for convenience
 */
export { getSession } from "./auth";

/**
 * Require authentication, redirect to login if not authenticated
 */
export async function requireAuth() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }
  return session;
}
