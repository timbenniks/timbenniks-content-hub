"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";

export function LoginButton() {
  return (
    <Button
      onClick={() => signIn("contentstack", { callbackUrl: "/projects" })}
      className="w-full"
      size="lg"
    >
      Sign in with Contentstack
    </Button>
  );
}
