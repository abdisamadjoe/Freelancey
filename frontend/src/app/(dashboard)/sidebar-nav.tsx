"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Calendar,
  ChevronDown,
  FolderKanban,
  LayoutDashboard,
  LayoutGrid,
  type LucideIcon,
  ScrollText,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sidebar navigation modelled on the NextAdmin template's sidebar
 * (dashboard/src/components/common/sidebar/).
 */
interface NavChild {
  title: string;
  href: string;
}

interface NavItem {
  title: string;
  href?: string;
  icon: LucideIcon;
  items?: NavChild[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Main Menu",
    items: [
      { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { title: "Projects", href: "/dashboard/projects", icon: FolderKanban },
      { title: "Calendar", href: "/dashboard/calendar", icon: Calendar },
      { title: "Clients", href: "/dashboard/clients", icon: Users },
    ],
  },
  {
    label: "Reports",
    items: [
      { title: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    ],
  },
  {
    label: "System",
    items: [
      {
        title: "Settings",
        icon: Settings,
        items: [
          { title: "Account", href: "/dashboard/settings/account" },
          { title: "Workspace", href: "/dashboard/settings/workspace" },
          { title: "Billing", href: "/dashboard/settings/billing" },
          { title: "Payments", href: "/dashboard/settings/payments" },
        ],
      },
    ],
  },
];

function isActiveHref(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface SidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "scrollbar-thin flex-1 overflow-y-auto",
        collapsed ? "mt-5 px-2" : "mt-7 space-y-6 px-4",
      )}
    >
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          {collapsed ? (
            <span className="flex items-center justify-center pt-6 pb-4" aria-hidden>
              <span className="size-1 rounded-full bg-border-secondary" />
            </span>
          ) : (
            <p className="mt-6 mb-3 text-xs font-medium text-text-tertiary uppercase">
              {section.label}
            </p>
          )}

          <div className={cn(collapsed ? "space-y-1.5" : "space-y-1")}>
            {section.items.map((item) => (
              <SidebarItem
                key={item.title}
                item={item}
                pathname={pathname}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarItem({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const hasChildren = Boolean(item.items?.length);
  const childActive = item.items?.some((child) => isActiveHref(child.href, pathname)) ?? false;
  const active = item.href ? isActiveHref(item.href, pathname) : childActive;

  const [expanded, setExpanded] = useState(childActive);

  if (collapsed) {
    const href = item.href ?? item.items?.[0]?.href ?? "#";
    return (
      <div className="flex justify-center">
        <Link
          href={href}
          onClick={onNavigate}
          title={item.title}
          aria-label={item.title}
          className={cn(
            "flex items-center justify-center rounded-lg px-3 py-2.5 transition-colors",
            active
              ? "bg-sidebar-nav-item-hover-background text-icon-primary"
              : "text-icon-tertiary hover:bg-sidebar-nav-item-hover-background hover:text-icon-primary",
          )}
        >
          <item.icon className="size-5" />
        </Link>
      </div>
    );
  }

  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            childActive
              ? "bg-sidebar-nav-item-hover-background text-text-primary"
              : "text-text-secondary hover:bg-sidebar-nav-item-hover-background hover:text-text-primary",
          )}
        >
          <span className="flex flex-1 items-center gap-3">
            <item.icon
              className={cn("size-5", childActive ? "text-icon-primary" : "text-icon-tertiary")}
            />
            <span>{item.title}</span>
          </span>
          <ChevronDown
            className={cn("size-4 text-icon-tertiary transition-transform", expanded && "rotate-180")}
          />
        </button>

        {expanded ? (
          <div className="mt-1 space-y-1">
            {item.items?.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={cn(
                  "block rounded-lg py-2 pr-3 pl-11 text-sm font-medium transition-colors",
                  isActiveHref(child.href, pathname)
                    ? "bg-sidebar-nav-item-hover-background text-text-primary"
                    : "text-text-secondary hover:bg-sidebar-nav-item-hover-background hover:text-text-primary",
                )}
              >
                {child.title}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      href={item.href ?? "#"}
      onClick={onNavigate}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-nav-item-hover-background text-text-primary"
          : "text-text-secondary hover:bg-sidebar-nav-item-hover-background hover:text-text-primary",
      )}
    >
      <item.icon className={cn("size-5", active ? "text-icon-primary" : "text-icon-tertiary")} />
      <span>{item.title}</span>
    </Link>
  );
}
