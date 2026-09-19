"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen, Menu } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./sign-out-button";
import { NotificationBell } from "@/components/notification-bell";
import { GlobalSearch } from "@/components/global-search";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * App shell ported from the NextAdmin layout
 * (dashboard/src/app/(with-layouts)/layout.tsx): collapsible desktop sidebar
 * plus a main column that renders as a rounded surface panel with its own
 * sticky header and internal scroll area.
 */
export interface AppShellProps {
  children: ReactNode;
  orgName: string;
  userName: string;
  userEmail: string;
  logoSrc: string | null;
  hideLogo?: boolean;
}

export function AppShell({
  children,
  orgName,
  userName,
  userEmail,
  logoSrc,
  hideLogo,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background-gray-secondary_alt_2">
      {/* Desktop sidebar (xl+) */}
      <aside
        style={{
          width: sidebarOpen ? "270px" : "72px",
          minWidth: sidebarOpen ? "270px" : "72px",
          transition:
            "width 300ms cubic-bezier(0.4,0,0.2,1), min-width 300ms cubic-bezier(0.4,0,0.2,1)",
        }}
        className="hidden shrink-0 overflow-hidden xl:block"
      >
        <Sidebar
          collapsed={!sidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
          orgName={orgName}
          logoSrc={logoSrc}
          hideLogo={hideLogo}
        />
      </aside>

      {/* Mobile sidebar (< xl) */}
      <Sheet open={mobileOpen} onClose={() => setMobileOpen(false)} side="left" title="Menu">
        <Sidebar
          collapsed={false}
          orgName={orgName}
          logoSrc={logoSrc}
          hideLogo={hideLogo}
          onNavigate={() => setMobileOpen(false)}
          onToggle={() => setMobileOpen(false)}
          showToggle={false}
        />
      </Sheet>

      {/* Main column */}
      <div className="min-w-0 flex-1 lg:p-4">
        <div className="flex h-full flex-col overflow-hidden border-[0.5px] border-card-surface-border bg-card-surface-area lg:rounded-2xl lg:shadow-panel">
          <header className="sticky top-0 z-40 flex w-full items-center gap-2.5 border-b-[0.5px] border-card-border bg-card-surface-area px-3 py-3 lg:px-5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary xl:hidden"
            >
              <Menu className="size-5" />
            </button>

            <Link
              href="/dashboard"
              className="flex min-w-0 items-center gap-2 xl:hidden"
              aria-label={`${orgName || "Freelancey"} home`}
            >
              {!hideLogo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={logoSrc || "/icon.png"}
                  alt=""
                  className="size-6 shrink-0 rounded-md object-contain"
                />
              ) : null}
              <span className="truncate text-sm leading-none font-semibold tracking-[-0.2px] text-text-primary">
                {orgName || "Freelancey"}
              </span>
            </Link>

            <div className="hidden min-w-0 flex-1 sm:block lg:max-w-xs">
              <GlobalSearch />
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <span className="sm:hidden">
                <GlobalSearch iconOnly />
              </span>
              <NotificationBell />
              <UserMenu
                name={userName}
                email={userEmail}
                logoSrc={logoSrc}
                hideLogo={hideLogo}
              />
            </div>
          </header>

          <main className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-384 px-4 py-6 lg:px-6 lg:pb-10">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
  orgName,
  logoSrc,
  hideLogo,
  showToggle = true,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  orgName: string;
  logoSrc: string | null;
  hideLogo?: boolean;
  showToggle?: boolean;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden border-r-[0.5px] border-card-border bg-card-surface-area">
      <div
        className={cn(
          "flex items-center gap-2 px-4 pt-6",
          collapsed ? "flex-col justify-center" : "justify-between",
        )}
      >
        <div className={cn("flex min-w-0 items-center gap-2.5", collapsed && "justify-center")}>
          {!hideLogo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={logoSrc || "/icon.png"}
              alt=""
              className="size-7 shrink-0 rounded-md object-contain"
            />
          ) : null}
          {!collapsed ? (
            <span className="truncate text-sm leading-none font-semibold tracking-[-0.2px] text-text-primary">
              {orgName || "Freelancey"}
            </span>
          ) : null}
        </div>

        {showToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        ) : null}
      </div>

      <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
    </div>
  );
}
