"use client";

import {
  GearIcon,
  LogoutIcon,
  UserCircleIcon,
} from "@/components/common/header/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/tailgrids/core/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuSection,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/tailgrids/core/dropdown";
import { useNav } from "@/components/common/sidebar/nav-context";
import { authClient } from "@/lib/auth/client";
import { AltArrowDownIcon } from "@/utils/icon";
import Link from "next/link";

interface UserProfileMenuItem {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export interface HeaderUser {
  name: string;
  email: string;
  avatarUrl?: string | null;
}

const STAFF_MENU: UserProfileMenuItem[] = [
  {
    href: "/dashboard/settings/account",
    icon: <UserCircleIcon />,
    label: "Account settings",
  },
  {
    href: "/dashboard/settings/workspace",
    icon: <GearIcon />,
    label: "Workspace settings",
  },
];

const PORTAL_MENU: UserProfileMenuItem[] = [
  {
    href: "/portal/settings",
    icon: <UserCircleIcon />,
    label: "Account settings",
  },
];

export function UserProfileButton({ user }: { user: HeaderUser }) {
  const { homeHref } = useNav();
  const menuItems = homeHref.startsWith("/portal") ? PORTAL_MENU : STAFF_MENU;
  const initial = (user.name || user.email || "U").charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex items-center gap-2.5 rounded-lg border-0 p-0 transition-all outline-none focus-visible:ring-4 focus-visible:ring-input-primary-focus-border/20 focus-visible:ring-offset-1">
        <Avatar>
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} className="size-10 rounded-lg" />}
          <AvatarFallback className="rounded-lg border border-border-secondary-alt bg-background-gray-secondary_alt">
            {initial}
          </AvatarFallback>
        </Avatar>

        <span className="max-w-40 truncate text-sm leading-5 font-medium text-text-primary">{user.name}</span>

        <AltArrowDownIcon className="text-icon-tertiary transition-transform duration-200 group-aria-expanded:-rotate-180" />
      </DropdownMenuTrigger>

      <DropdownMenuContent placement="bottom end" className="w-70 overflow-hidden p-0 shadow-3xl">
        <DropdownMenuHeader className="flex w-full items-center justify-start gap-2 border-b border-border-secondary-alt px-4 py-3">
          <Avatar size="md">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
            <AvatarFallback className="border border-border-secondary-alt bg-background-gray-secondary_alt">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-text-primary">{user.name}</span>
            <span className="truncate text-xs text-gray-500">{user.email}</span>
          </span>
        </DropdownMenuHeader>

        <DropdownMenuSection className="p-1.5">
          {menuItems.map((item) => (
            <DropdownMenuItem
              key={item.label}
              href={item.href}
              className="cursor-pointer px-3 py-2.5"
              render={(domProps) =>
                "href" in domProps ? <Link {...domProps} /> : <div {...domProps} />
              }
            >
              <span className="shrink-0 text-icon-secondary group-hover:text-text-primary">
                {item.icon}
              </span>
              <span className="leading-5 font-medium">{item.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuSection>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onAction={async () => {
            await authClient.signOut();
            window.location.href = "/login";
          }}
          className="m-1.5 w-auto cursor-pointer px-3 py-2.5"
        >
          <span className="text-icon-secondary group-hover:text-text-primary">
            <LogoutIcon />
          </span>
          <span className="leading-5">Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
