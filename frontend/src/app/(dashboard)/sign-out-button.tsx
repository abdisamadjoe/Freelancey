"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown";

export function SignOutButton({
  variant = "icon",
  className,
}: {
  variant?: "icon" | "menu-item";
  className?: string;
}) {
  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  if (variant === "menu-item") {
    return (
      <DropdownMenuItem icon={<LogOut />} onSelect={handleSignOut} destructive>
        Sign out
      </DropdownMenuItem>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      title="Sign out"
      aria-label="Sign out"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary",
        className,
      )}
    >
      <LogOut className="size-4" />
    </button>
  );
}

/**
 * Header user menu — avatar trigger with account links and sign-out, matching
 * the NextAdmin header's user profile button.
 */
export function UserMenu({
  name,
  email,
  logoSrc,
  hideLogo,
}: {
  name: string;
  email: string;
  logoSrc?: string | null;
  hideLogo?: boolean;
}) {
  const initial = (name || email || "U").charAt(0).toUpperCase();

  return (
    <DropdownMenu
      align="end"
      contentClassName="min-w-56"
      trigger={
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-background-gray-secondary"
          aria-label="Account menu"
        >
          {logoSrc && !hideLogo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={logoSrc}
              alt=""
              className="size-8 shrink-0 rounded-full border-[0.5px] border-card-border object-contain p-1"
            />
          ) : (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-medium text-white">
              {initial}
            </span>
          )}
          <span className="hidden min-w-0 max-w-40 flex-col items-start text-left lg:flex">
            <span className="w-full truncate text-sm font-medium text-text-primary">{name}</span>
          </span>
        </button>
      }
    >
      <div className="px-2.5 py-2">
        <p className="truncate text-sm font-medium text-text-primary">{name}</p>
        <p className="truncate text-xs text-text-tertiary">{email}</p>
      </div>
      <div className="my-1.5 h-px bg-border-secondary-alt" role="separator" />
      <Link
        href="/dashboard/settings/account"
        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background-gray-secondary_alt hover:text-text-primary"
      >
        Account settings
      </Link>
      <Link
        href="/dashboard/settings/workspace"
        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background-gray-secondary_alt hover:text-text-primary"
      >
        Workspace settings
      </Link>
      <div className="my-1.5 h-px bg-border-secondary-alt" role="separator" />
      <SignOutButton variant="menu-item" />
    </DropdownMenu>
  );
}
