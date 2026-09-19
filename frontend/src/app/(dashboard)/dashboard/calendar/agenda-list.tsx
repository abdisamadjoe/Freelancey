"use client";

import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { Card, EmptyState, StatusBadge } from "@/components/ui";
import type { CalendarEvent } from "./types";
import { groupByDate } from "./types";
import { EventChip } from "./event-chip";

/** Tasks and invoices carry a status; project milestones do not. */
function eventStatus(event: CalendarEvent): string | null {
  return "status" in event ? event.status : null;
}

export function AgendaList({ events }: { events: CalendarEvent[] }) {
  const grouped = useMemo(() => groupByDate(events), [events]);
  const dates = useMemo(() => Array.from(grouped.keys()).sort(), [grouped]);

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="size-5" aria-hidden />}
        title="No items in this window."
      />
    );
  }

  return (
    <Card className="p-0 overflow-hidden">
      {dates.map((date) => {
        const items = grouped.get(date) ?? [];
        const display = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
          weekday: "short", month: "short", day: "numeric", year: "numeric",
        });
        return (
          <div key={date}>
            <div className="sticky top-0 z-10 border-b border-border-primary bg-background-gray-secondary_alt px-5 py-2.5 text-xs leading-5 font-medium text-text-secondary">
              {display}
            </div>
            <div className="divide-y divide-border-primary">
              {items.map((e) => {
                const status = eventStatus(e);
                return (
                  <div
                    key={`${e.type}-${e.id}-${e.date}-agenda`}
                    className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors hover:bg-background-gray-primary"
                  >
                    <div className="min-w-0 flex-1">
                      <EventChip event={e} />
                    </div>
                    {status ? <StatusBadge status={status} className="shrink-0" /> : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </Card>
  );
}
