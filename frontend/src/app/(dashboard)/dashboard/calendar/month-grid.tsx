"use client";

import { useMemo, useState } from "react";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui";
import { cn } from "@/lib/utils";
import { gridDays, groupByDate, isSameDay, toISODate } from "./types";
import type { CalendarEvent } from "./types";
import { EventChip } from "./event-chip";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE = 3;

export function MonthGrid({ month, events }: { month: Date; events: CalendarEvent[] }) {
  const [popoverDate, setPopoverDate] = useState<string | null>(null);
  const days = useMemo(() => gridDays(month), [month]);
  const today = new Date();
  const byDate = useMemo(() => groupByDate(events), [events]);
  const lastRow = Math.floor((days.length - 1) / 7);

  return (
    <>
      <div className="overflow-hidden rounded-xl border-[0.5px] border-card-border bg-card-background">
        <div className="grid grid-cols-7 border-b border-border-primary bg-background-gray-secondary_alt">
          {WEEKDAYS.map((w, i) => {
            const isWeekend = i === 0 || i === 6;
            return (
              <div
                key={w}
                className={cn(
                  "py-2.5 text-center text-xs font-medium",
                  isWeekend ? "text-text-tertiary" : "text-text-secondary",
                )}
              >
                {w}
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, idx) => {
            const iso = toISODate(d);
            const inMonth = d.getMonth() === month.getMonth();
            const dayOfWeek = d.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const col = idx % 7;
            const row = Math.floor(idx / 7);
            const isLastCol = col === 6;
            const isLastRow = row === lastRow;
            const borders = cn(
              "border-border-primary",
              !isLastCol && "border-r",
              !isLastRow && "border-b",
            );

            if (!inMonth) {
              return (
                <div
                  key={iso}
                  className={cn("min-h-[110px] bg-background-gray-secondary_alt", borders)}
                />
              );
            }

            const isToday = isSameDay(d, today);
            const dayEvents = byDate.get(iso) ?? [];
            const visible = dayEvents.slice(0, MAX_VISIBLE);
            const overflow = dayEvents.length - visible.length;

            return (
              <div
                key={iso}
                className={cn(
                  "flex min-h-[110px] flex-col gap-1 p-1.5 transition-colors hover:bg-background-gray-primary",
                  borders,
                  isWeekend && "bg-background-gray-primary",
                )}
              >
                <div className="flex justify-end pr-0.5">
                  {isToday ? (
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-brand-500 text-xs leading-4 font-medium text-white-100">
                      {d.getDate()}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "px-1 text-xs font-medium",
                        isWeekend ? "text-text-tertiary" : "text-text-secondary",
                      )}
                    >
                      {d.getDate()}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  {visible.map((e) => (
                    <EventChip key={`${e.type}-${e.id}-${e.date}`} event={e} />
                  ))}
                  {overflow > 0 && (
                    <button
                      type="button"
                      onClick={() => setPopoverDate(iso)}
                      className="rounded-md px-1.5 py-0.5 text-left text-xs leading-4 font-medium text-neutral-brand-color transition-colors hover:bg-badge-primary-background"
                    >
                      +{overflow} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {popoverDate !== null && (
        <Modal open onClose={() => setPopoverDate(null)} size="sm">
          <ModalHeader title={popoverDate} />
          <ModalBody className="space-y-1.5">
            {(byDate.get(popoverDate) ?? []).map((e) => (
              <EventChip key={`${e.type}-${e.id}-${e.date}-pop`} event={e} />
            ))}
          </ModalBody>
          <ModalFooter>
            <Button appearance="outline" size="sm" onClick={() => setPopoverDate(null)}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}
