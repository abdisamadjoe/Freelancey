"use client";

import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-text-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary"
    >
      <LogOut className="size-4" aria-hidden />
      Sign Out
    </button>
  );
}
