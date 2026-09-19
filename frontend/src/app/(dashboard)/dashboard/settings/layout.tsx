"use client";

import { usePathname, useRouter } from "next/navigation";
import { Tab, TabList, Tabs } from "@/components/ui";

interface Section {
  href: string;
  label: string;
}

const SECTIONS: Section[] = [
  { href: "/dashboard/settings/account", label: "Account" },
  { href: "/dashboard/settings/workspace", label: "Workspace" },
  { href: "/dashboard/settings/billing", label: "Billing" },
  { href: "/dashboard/settings/payments", label: "Payments" },
];

/**
 * Section navigation for the settings area, rendered with the design system's
 * line tabs (dashboard/.../profile/layout.tsx uses the same underline pattern
 * for its section switches).
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="space-y-5">
      <Tabs
        value={pathname}
        onValueChange={(href) => router.push(href)}
        variant="line"
        className="max-w-full"
      >
        <TabList className="[&>button]:shrink-0">
          {SECTIONS.map((s) => (
            <Tab key={s.href} value={s.href}>
              {s.label}
            </Tab>
          ))}
        </TabList>
      </Tabs>
      {children}
    </div>
  );
}
