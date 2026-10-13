"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/tailgrids/core/card";
import { cn } from "@/utils/cn";
import Link from "next/link";
import type { ReactNode } from "react";
import { BoxIcon, EyeIcon, MoneyBagIcon, UserGroupIcon } from "./icons";

/** The template's four icon styles (overview-stats/data.tsx), unchanged. */
export const overviewStatStyles = {
  blue: {
    icon: <EyeIcon />,
    iconBgClass: "bg-[rgba(59,130,246,0.10)]",
    iconColorClass: "text-[#3B82F6]",
  },
  green: {
    icon: <MoneyBagIcon />,
    iconBgClass: "bg-[rgba(34,197,94,0.10)]",
    iconColorClass: "text-[#22C55E]",
  },
  orange: {
    icon: <BoxIcon />,
    iconBgClass: "bg-[rgba(249,115,22,0.10)]",
    iconColorClass: "text-[#F97316]",
  },
  purple: {
    icon: <UserGroupIcon />,
    iconBgClass: "bg-[rgba(168,85,247,0.10)]",
    iconColorClass: "text-[#A855F7]",
  },
} as const;

export type OverviewStatStyle = keyof typeof overviewStatStyles;

export interface OverviewStat {
  id: string;
  title: string;
  value: string | number;
  style: OverviewStatStyle;
  /** Makes the whole card a link. */
  href?: string;
}

/**
 * The template's overview stat card (overview-stats/index.tsx): icon tile, value, label.
 * Its period-over-period change figure is left out because the API has no previous-period data.
 */
export function OverviewStatCard({ stat }: { stat: OverviewStat }) {
  const { icon, iconBgClass, iconColorClass } = overviewStatStyles[stat.style];

  const card = (
    <Card>
      {/* Icon */}
      <CardHeader>
        <div className={cn("flex size-8 items-center justify-center rounded-lg", iconBgClass, iconColorClass)}>
          {icon}
        </div>
      </CardHeader>

      {/* Value */}
      <CardContent className="mt-6 p-0">
        <div className="mb-1.25 text-xl leading-7 font-semibold text-text-primary md:text-2xl md:leading-8">
          {stat.value}
        </div>
      </CardContent>

      {/* Label */}
      <CardFooter className="flex items-center justify-between p-0">
        <span className="text-sm leading-5 font-medium text-text-tertiary">{stat.title}</span>
      </CardFooter>
    </Card>
  );

  return stat.href ? (
    <Link href={stat.href} className="block rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-input-primary-focus-border/20">
      {card}
    </Link>
  ) : (
    card
  );
}

export function OverviewStatsGrid({ stats, columns = "four" }: { stats: OverviewStat[]; columns?: "four" | "five" }): ReactNode {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-5 md:grid-cols-2",
        columns === "five" ? "lg:grid-cols-5" : "lg:grid-cols-4",
      )}
    >
      {stats.map((stat) => (
        <OverviewStatCard key={stat.id} stat={stat} />
      ))}
    </div>
  );
}
