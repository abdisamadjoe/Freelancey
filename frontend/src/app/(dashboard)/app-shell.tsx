"use client";

import Header from "@/components/common/header";
import Sidebar from "@/components/common/sidebar";
import { SheetContent, SheetOverlay, SheetTitle } from "@/components/tailgrids/core/sheet";
import { cn } from "@/utils/cn";
import { ReactNode, useState } from "react";

/**
 * The dashboard shell, copied from the template's (with-layouts)/layout.tsx:
 * a collapsible desktop sidebar, a mobile sidebar sheet, and a rounded content
 * panel with its own sticky header and scroll area.
 */
export interface AppShellProps {
  children: ReactNode;
  orgName: string;
  userName: string;
  userEmail: string;
  logoSrc: string | null;
  hideLogo?: boolean;
}

export function AppShell({ children, orgName, userName, userEmail, logoSrc, hideLogo }: AppShellProps) {
  // XL+ sidebar expand/collapse state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // Mobile sheet open state (< xl breakpoint)
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const brand = { orgName, logoSrc, hideLogo };

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-background-gray-secondary_alt_2">
      {/*  Desktop sidebar (xl+) — always in DOM, toggles width  */}
      <aside
        style={{
          width: isSidebarOpen ? "270px" : "72px",
          minWidth: isSidebarOpen ? "270px" : "72px",
          transition:
            "width 300ms cubic-bezier(0.4,0,0.2,1), min-width 300ms cubic-bezier(0.4,0,0.2,1)",
        }}
        className="hidden shrink-0 overflow-hidden xl:block"
      >
        <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} brand={brand} />
      </aside>

      {/*  Mobile sidebar (< xl) — Sheet sliding from the left  */}
      <SheetOverlay isOpen={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-67.5! max-w-67.5! border-r border-card-border bg-card-surface-area p-0"
        >
          <SheetTitle className="sr-only">Sidebar</SheetTitle>
          <Sidebar
            isSidebarOpen={true}
            toggleSidebar={() => {
              setIsMobileSheetOpen(false);
            }}
            onItemClick={() => {
              setIsMobileSheetOpen(false);
            }}
            isMobileSheet
            brand={brand}
          />
        </SheetContent>
      </SheetOverlay>

      {/*  Main content column  */}
      <div className={cn("min-w-0 flex-1", isSidebarOpen ? "lg:p-4 xl:pr-4" : "lg:py-4 xl:px-4")}>
        <div className="flex h-full flex-col overflow-hidden border-[0.5px] border-card-surface-border bg-card-surface-area lg:rounded-2xl lg:shadow-[0_3px_6px_-2px_rgba(0,0,0,0.02),0_1px_1px_0_rgba(0,0,0,0.04)]">
          <Header
            onMenuClick={() => setIsMobileSheetOpen(true)}
            brand={brand}
            user={{ name: userName, email: userEmail }}
          />

          <main className="scrollbar-thin flex-1 min-h-0 overflow-y-auto">
            {/* The template's pages open with `mt-6` and `px-2 lg:px-5`; the pages here share that wrapper. */}
            <div className="mx-auto mt-6 w-full max-w-384 px-2 pb-5 lg:px-5">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
