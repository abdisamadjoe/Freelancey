"use client";

import Link from "next/link";
import { CheckSquare, PlayCircle, StopCircle, Receipt } from "lucide-react";
import { TASK_STATUSES } from "@/shared";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarEventType } from "./types";

function chipHref(e: CalendarEvent): string {
  if (e.type === "task") return `/dashboard/projects/${e.projectId}?tab=tasks&task=${e.id}`;
  if (e.type === "project_start" || e.type === "project_end") return `/dashboard/projects/${e.projectId}`;
  if (e.type === "invoice_due" && e.projectId) return `/dashboard/projects/${e.projectId}?tab=invoices`;
  return "#";
}

/**
 * Event tints come from the calendar design tokens declared in
 * `globals.css` (`--calendar-*-background` / `--calendar-*-badge`).
 */
const CHIP_TONE: Record<CalendarEventType, { wrap: string; icon: string }> = {
  task: {
    wrap: "border-l-[color:var(--calendar-primary-badge)] bg-[var(--calendar-primary-background)]",
    icon: "text-[color:var(--calendar-primary-badge)]",
  },
  project_start: {
    wrap: "border-l-[color:var(--calendar-success-badge)] bg-[var(--calendar-success-background)]",
    icon: "text-[color:var(--calendar-success-badge)]",
  },
  project_end: {
    wrap: "border-l-[color:var(--calendar-info-badge)] bg-[var(--calendar-info-background)]",
    icon: "text-[color:var(--calendar-info-badge)]",
  },
  invoice_due: {
    wrap: "border-l-[color:var(--calendar-warning-badge)] bg-[var(--calendar-warning-background)]",
    icon: "text-[color:var(--calendar-warning-badge)]",
  },
};

export function EventChip({ event, compact = false }: { event: CalendarEvent; compact?: boolean }) {
  let icon: React.ReactNode;
  let label: string;
  let tooltip: string;
  let muted = false;

  if (event.type === "task") {
    icon = <CheckSquare aria-hidden />;
    label = event.title;
    tooltip = `${event.title} · ${event.projectName}${event.assigneeName ? ` · ${event.assigneeName}` : ""}`;
    muted = event.status === TASK_STATUSES.DONE;
  } else if (event.type === "project_start") {
    icon = <PlayCircle aria-hidden />;
    label = `Start: ${event.title}`;
    tooltip = `Project starts: ${event.title}`;
  } else if (event.type === "project_end") {
    icon = <StopCircle aria-hidden />;
    label = `End: ${event.title}`;
    tooltip = `Project ends: ${event.title}`;
  } else if (event.type === "invoice_due") {
    icon = <Receipt aria-hidden />;
    label = event.title;
    tooltip = `Invoice ${event.title} due${event.projectName ? ` · ${event.projectName}` : ""}`;
    muted = event.status === "paid";
  } else {
    icon = null;
    label = "";
    tooltip = "";
  }

  const tone = CHIP_TONE[event.type];

  return (
    <Link
      href={chipHref(event)}
      title={tooltip}
      className={cn(
        "flex min-w-0 items-center gap-1.5 rounded-md border-l-[3px] px-1.5 py-0.5 text-xs leading-4 transition hover:brightness-95",
        tone.wrap,
        compact ? "w-auto" : "w-full",
        muted && "opacity-50",
      )}
    >
      <span className={cn("shrink-0 [&>svg]:size-3", tone.icon)}>{icon}</span>
      <span className={cn("truncate text-text-secondary", muted && "line-through")}>{label}</span>
    </Link>
  );
}
