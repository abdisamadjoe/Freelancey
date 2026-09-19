"use client";

import { usePathname, useRouter } from "next/navigation";
import { Tab, TabList, Tabs } from "@/components/ui";

interface ReportTab {
  href: string;
  label: string;
}

// Add new reports here. The tab strip shows automatically once there are 2+.
const REPORTS: ReportTab[] = [
  { href: "/dashboard/reports/time", label: "Time" },
];

export default function ReportsLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="space-y-5">
      {REPORTS.length > 1 && (
        <Tabs
          value={pathname}
          onValueChange={(href) => router.push(href)}
          variant="line"
          className="max-w-full"
        >
          <TabList>
            {REPORTS.map((r) => (
              <Tab key={r.href} value={r.href}>
                {r.label}
              </Tab>
            ))}
          </TabList>
        </Tabs>
      )}
      {children}
    </div>
  );
}
