"use client";

import { Page, PageBody } from "@/components/app/kit";
import { cn } from "@/utils/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const SECTIONS = [
  { href: "/dashboard/settings/account", label: "Account" },
  { href: "/dashboard/settings/workspace", label: "Workspace" },
  { href: "/dashboard/settings/billing", label: "Billing" },
  { href: "/dashboard/settings/payments", label: "Payments" },
];

/** Section navigation for the settings area. */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <Page>
      <PageBody>
        <nav className="flex max-w-full gap-1 overflow-x-auto border-b border-card-border">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={cn(
                "shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap",
                pathname === s.href ? "-mb-px border-b-2 border-primary-500 text-neutral-brand-color" : "text-text-tertiary hover:text-text-primary",
              )}
            >
              {s.label}
            </Link>
          ))}
        </nav>
      </PageBody>
      {children}
    </Page>
  );
}
