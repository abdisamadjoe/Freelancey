"use client";

import { Empty, ErrorNote, fmtDate, Loading, Notice, Page, PageBody, PageHeader, Panel, SelectInput, StatusBadge } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import { apiFetch } from "@/lib/api";
import {
  addMonths,
  ALL_TYPES,
  type CalendarEvent,
  type CalendarEventType,
  groupByDate,
  gridDays,
  gridEnd,
  gridStart,
  isSameDay,
  toISODate,
} from "@/lib/calendar";
import { money } from "@/components/app/kit";
import { cn } from "@/utils/cn";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const TYPE_LABEL: Record<CalendarEventType, string> = {
  task: "Tasks",
  project_start: "Project starts",
  project_end: "Project deadlines",
  invoice_due: "Invoices due",
};

const TYPE_COLOR: Record<CalendarEventType, "blue" | "success" | "error" | "orange"> = {
  task: "blue",
  project_start: "success",
  project_end: "error",
  invoice_due: "orange",
};

function eventHref(e: CalendarEvent): string {
  if (e.type === "task") return `/dashboard/projects/${e.projectId}?tab=tasks&task=${e.id}`;
  if (e.type === "invoice_due") return e.projectId ? `/dashboard/projects/${e.projectId}?tab=invoices` : "/dashboard/invoices";
  return `/dashboard/projects/${e.projectId}`;
}

function EventChip({ event }: { event: CalendarEvent }) {
  return (
    <Link
      href={eventHref(event)}
      className="block truncate rounded-md bg-background-gray-secondary_alt px-1.5 py-0.5 text-xs text-text-primary hover:bg-dropdown-hover-background"
      title={event.title}
    >
      {event.title}
    </Link>
  );
}

export default function CalendarPage() {
  const [month, setMonth] = useState<Date>(() => new Date());
  const [view, setView] = useState<"month" | "agenda">("month");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [projectId, setProjectId] = useState("");
  const [types, setTypes] = useState<Set<CalendarEventType>>(() => new Set(ALL_TYPES));
  const [assigneeId, setAssigneeId] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    apiFetch<{ data: { id: string; name: string }[] } | { id: string; name: string }[]>("/projects?limit=100")
      .then((res) => setProjects(Array.isArray(res) ? res : res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ from: toISODate(gridStart(month)), to: toISODate(gridEnd(month)) });
    if (projectId) params.set("projectId", projectId);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) params.set("tz", tz);
    apiFetch<CalendarEvent[]>(`/calendar?${params}`, { signal: controller.signal })
      .then(setEvents)
      .catch((err) => {
        if ((err as Error).name !== "AbortError") setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month, projectId]);

  const visible = useMemo(
    () =>
      events.filter((e) => {
        if (!types.has(e.type)) return false;
        if (assigneeId && e.type === "task" && e.assigneeId !== assigneeId) return false;
        return true;
      }),
    [events, types, assigneeId],
  );

  const assignees = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of events) if (e.type === "task" && e.assigneeId && e.assigneeName) seen.set(e.assigneeId, e.assigneeName);
    return Array.from(seen.entries()).map(([id, name]) => ({ value: id, label: name }));
  }, [events]);

  const byDate = useMemo(() => groupByDate(visible), [visible]);
  const days = useMemo(() => gridDays(month), [month]);
  const today = new Date();
  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const agendaDates = Array.from(byDate.keys()).sort();

  return (
    <Page>
      <PageHeader title="Calendar" description="Task due dates, project start and end dates, and invoices due." />
      <PageBody>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <Button size="sm" appearance="outline" variant="primary" onPress={() => setMonth((m) => addMonths(m, -1))}>
              Previous
            </Button>
            <span className="min-w-36 text-center text-sm font-medium text-text-primary">{monthLabel}</span>
            <Button size="sm" appearance="outline" variant="primary" onPress={() => setMonth((m) => addMonths(m, 1))}>
              Next
            </Button>
            <Button size="sm" variant="ghost" onPress={() => setMonth(new Date())}>
              Today
            </Button>
          </div>
          <div className="w-44">
            <SelectInput
              value={view}
              onChange={(v) => setView(v as "month" | "agenda")}
              options={[
                { value: "month", label: "Month view" },
                { value: "agenda", label: "Agenda view" },
              ]}
            />
          </div>
          <div className="w-52">
            <SelectInput
              value={projectId}
              onChange={setProjectId}
              options={[{ value: "", label: "All projects" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
            />
          </div>
          {assignees.length > 0 && types.has("task") && (
            <div className="w-48">
              <SelectInput value={assigneeId} onChange={setAssigneeId} options={[{ value: "", label: "All assignees" }, ...assignees]} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          {ALL_TYPES.map((t) => (
            <Checkbox
              key={t}
              isSelected={types.has(t)}
              onChange={(on) =>
                setTypes((prev) => {
                  const next = new Set(prev);
                  if (on) next.add(t);
                  else next.delete(t);
                  return next;
                })
              }
            >
              <span className="flex items-center gap-1.5 text-sm text-text-primary">
                {TYPE_LABEL[t]} <StatusBadge color={TYPE_COLOR[t]}>{visible.filter((e) => e.type === t).length}</StatusBadge>
              </span>
            </Checkbox>
          ))}
        </div>

        {error != null && <ErrorNote error={error} />}

        {loading ? (
          <Loading />
        ) : view === "month" ? (
          <Panel flush>
            <div className="grid grid-cols-7 border-b border-card-border bg-background-gray-secondary_alt text-xs font-semibold text-text-secondary">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="px-2 py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((d) => {
                const key = toISODate(d);
                const list = byDate.get(key) ?? [];
                const inMonth = d.getMonth() === month.getMonth();
                return (
                  <div
                    key={key}
                    className={cn("min-h-24 space-y-1 border-r border-b border-card-border p-1.5", !inMonth && "bg-background-gray-secondary_alt/50 text-text-tertiary")}
                  >
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full text-xs",
                        isSameDay(d, today) ? "bg-button-primary-background font-medium text-white-100" : "text-text-secondary",
                      )}
                    >
                      {d.getDate()}
                    </span>
                    {list.slice(0, 3).map((e) => (
                      <EventChip key={`${e.type}-${e.id}`} event={e} />
                    ))}
                    {list.length > 3 && <p className="px-1 text-xs text-text-tertiary">+{list.length - 3} more</p>}
                  </div>
                );
              })}
            </div>
          </Panel>
        ) : agendaDates.length === 0 ? (
          <Empty>Nothing scheduled this month.</Empty>
        ) : (
          <div className="space-y-4">
            {agendaDates.map((date) => (
              <Panel key={date} title={fmtDate(date)}>
                <ul className="divide-y divide-card-border">
                  {byDate.get(date)!.map((e) => (
                    <li key={`${e.type}-${e.id}`} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <Link href={eventHref(e)} className="truncate text-sm font-medium text-text-primary hover:text-neutral-brand-color">
                          {e.title}
                        </Link>
                        <p className="text-xs text-text-tertiary">
                          {e.projectName ?? ""}
                          {e.type === "invoice_due" ? ` · ${money(e.amountCents)}` : ""}
                          {e.type === "task" && e.assigneeName ? ` · ${e.assigneeName}` : ""}
                        </p>
                      </div>
                      <StatusBadge color={TYPE_COLOR[e.type]}>{TYPE_LABEL[e.type]}</StatusBadge>
                    </li>
                  ))}
                </ul>
              </Panel>
            ))}
          </div>
        )}
        <Notice status="info">Times use your browser&apos;s timezone.</Notice>
      </PageBody>
    </Page>
  );
}
