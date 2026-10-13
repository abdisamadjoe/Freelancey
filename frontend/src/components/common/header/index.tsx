"use client";

import { MenuIcon } from "@/components/common/header/icons";
import ThemeToggle from "@/components/common/header/theme-toggle";
import { UserProfileButton, type HeaderUser } from "@/components/common/header/user-profile";
import { ThreeDots } from "@/components/common/sidebar/icon";
import { cn } from "@/utils/cn";
import Link from "next/link";
import React from "react";
import { NotificationsButton } from "./notifications";
import SearchBar from "./searchbar";

//  Main Header
export interface HeaderBrand {
  orgName: string;
  logoSrc: string | null;
  hideLogo?: boolean;
}

export default function Header({
  onMenuClick,
  brand,
  user,
}: {
  onMenuClick?: () => void;
  brand: HeaderBrand;
  user: HeaderUser;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b-[0.5px] border-card-border bg-card-surface-area px-2 py-4 lg:px-5">
        {/*  Mobile layout (< xl)  3-column grid: menu | logo | dots */}
        <div className="flex items-center xl:hidden">
          {/* Left: Menu / Hamburger */}
          <div className="flex flex-1 justify-start">
            <button
              id="mobile-menu-toggle"
              onClick={onMenuClick}
              aria-label="Open sidebar menu"
              className="rounded-md px-1.5 py-1 text-icon-tertiary transition-colors hover:text-text-primary"
            >
              <MenuIcon />
            </button>
          </div>

          {/* Center: Logo */}
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center justify-center gap-2"
            aria-label={`${brand.orgName || "Freelancey"} home`}
          >
            {!brand.hideLogo && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={brand.logoSrc || "/icon.png"} alt="" className="size-7 shrink-0 rounded-md object-contain" />
            )}
            <span className="truncate text-lg leading-none font-semibold tracking-[-0.2px] text-text-primary">
              {brand.orgName || "Freelancey"}
            </span>
          </Link>

          {/* Right: Three-dot */}
          <div className="flex flex-1 justify-end">
            <button
              id="mobile-info-toggle"
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              aria-label="Open quick access"
              className={cn(
                "rounded-md px-1.5 py-3 transition-colors",
                isDrawerOpen
                  ? "bg-background-gray-secondary text-text-primary"
                  : "text-icon-tertiary hover:text-text-primary",
              )}
            >
              <ThreeDots />
            </button>
          </div>
        </div>

        {/* Desktop layout (xl+) - original layout */}
        <div className="hidden items-center justify-between xl:flex">
          {/* Left Side - Search */}
          <div className="max-w-xs flex-1">
            <SearchBar />
          </div>

          {/* Right Side - Actions */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <NotificationsButton />
            <UserProfileButton user={user} />
          </div>
        </div>
      </header>

      {/* Mobile Info */}
      <MobileInfoDrawer isOpen={isDrawerOpen} user={user} />
    </>
  );
}

// Mobile Info
function MobileInfoDrawer({ isOpen, user }: { isOpen: boolean; user: HeaderUser }) {
  return (
    <div className={cn("xl:hidden", isOpen ? "block" : "hidden")}>
      <div className="px-5 py-4 shadow-xs">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <NotificationsButton />
            <ThemeToggle />
            <SearchBar />
          </div>

          {/* Right Side - Actions */}
          <UserProfileButton user={user} />
        </div>
      </div>
    </div>
  );
}
