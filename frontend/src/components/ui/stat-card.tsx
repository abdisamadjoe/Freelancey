import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "./card";

export type StatTone = "blue" | "green" | "orange" | "violet" | "red" | "brand";

const TONE_STYLES: Record<StatTone, string> = {
  blue: "bg-[rgba(59,130,246,0.10)] text-[#3b82f6]",
  green: "bg-[rgba(34,197,94,0.10)] text-[#22c55e]",
  orange: "bg-[rgba(249,115,22,0.10)] text-[#f97316]",
  violet: "bg-[rgba(168,85,247,0.10)] text-[#a855f7]",
  red: "bg-[rgba(220,38,38,0.10)] text-[#dc2626]",
  brand: "bg-badge-primary-background text-neutral-brand-color",
};

/** Metric card props. Renders the template's overview stat card. */
export interface StatCardProps {
  title: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: StatTone;
  /** Optional change indicator, e.g. "+12.5%". */
  change?: string;
  isPositive?: boolean;
  footer?: ReactNode;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  tone = "brand",
  change,
  isPositive = true,
  footer,
  className,
}: StatCardProps) {
  return (
    // The template's overview stat card (overview-stats/index.tsx): icon tile, value, label and change.
    <Card className={className}>
      <div className="relative flex w-full flex-wrap items-center justify-between gap-3">
        <div className={cn("flex size-8 items-center justify-center rounded-lg [&>svg]:size-4.5", TONE_STYLES[tone])}>
          <Icon aria-hidden />
        </div>
      </div>

      <div className="mt-6 p-0">
        <div className="mb-1.25 text-xl leading-7 font-semibold text-text-primary md:text-2xl md:leading-8">{value}</div>
      </div>

      <div className="flex items-center justify-between p-0">
        <span className="text-sm leading-5 font-medium text-text-tertiary">{title}</span>
        {change ? (
          <span
            className={cn(
              "flex items-center gap-1 text-sm leading-5 font-medium",
              isPositive ? "text-green-600" : "text-red-600",
            )}
          >
            {change}
            {isPositive ? (
              <ArrowUpRight className="size-3.5" aria-hidden />
            ) : (
              <ArrowDownRight className="size-3.5" aria-hidden />
            )}
          </span>
        ) : null}
      </div>

      {footer ? <div className="mt-3 border-t border-card-border pt-3">{footer}</div> : null}
    </Card>
  );
}
