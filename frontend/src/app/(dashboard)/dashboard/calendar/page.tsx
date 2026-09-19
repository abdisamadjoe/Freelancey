"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronDown, SlidersHorizontal } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Field,
  NativeSelect,
  Skeleton,
} from "@/components/ui";
import {
  ALL_TYPES,
  addMonths,
  gridStart,
  gridEnd,
  toISODate,
  type CalendarEvent,
  type CalendarEventType,
} from "./types";
import { MonthGrid } from "./month-grid";
import { AgendaList } from "./agenda-list";

interface ProjectOption { id: string; name: string }
type ProjectsResponse = { data: ProjectOption[] } | ProjectOption[];

const TYPE_LABEL: Record<CalendarEventType, string> = {
  task: "Tasks",
  project_start: "Project starts",
  project_end: "Project ends",
  invoice_due: "Invoices",
};

/** Grid + agenda placeholder shown while a month window is loading. */
function CalendarSkeleton(): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-xl border-[0.5px] border-card-border bg-card-background">
      <div className="grid grid-cols-7 border-b border-border-primary bg-background-gray-secondary_alt">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex justify-center py-3">
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "min-h-[110px] border-border-primary p-2",
              i % 7 !== 6 && "border-r",
              i < 28 && "border-b",
            )}
          >
            <Skeleton className="ml-auto h-3 w-5" />
            <Skeleton className="mt-2.5 h-5 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CalendarPage(): React.ReactElement {
  const [month, setMonth] = useState<Date>(() => new Date());
  const [view, setView] = useState<"month" | "agenda">("month");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<Set<CalendarEventType>>(() => new Set(ALL_TYPES));
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pickerOpen && !filterOpen) return;
    function onClick(e: MouseEvent): void {
      if (pickerOpen && pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
      if (filterOpen && filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        setPickerOpen(false);
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen, filterOpen]);

  useEffect(() => {
    apiFetch<ProjectsResponse>("/projects?limit=100")
      .then((res) => setProjects(Array.isArray(res) ? res : res.data))
      .catch((err: unknown) => { console.error(err); });
  }, []);

  const load = useCallback(async (signal?: AbortSignal): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const from = toISODate(gridStart(month));
      const to = toISODate(gridEnd(month));
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);
      if (tz) params.set("tz", tz);
      if (projectId) params.set("projectId", projectId);
      const res = await apiFetch<CalendarEvent[]>(`/calendar?${params.toString()}`, { signal });
      if (signal?.aborted) return;
      setEvents(res);
    } catch (err) {
      if (signal?.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
      const msg = err instanceof Error ? err.message : "Failed to load";
      setError(msg);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [month, projectId]);

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const filtered = useMemo<CalendarEvent[]>(() => {
    return events.filter((e) => {
      if (!typeFilter.has(e.type)) return false;
      if (assigneeId && e.type === "task" && e.assigneeId !== assigneeId) return false;
      return true;
    });
  }, [events, typeFilter, assigneeId]);

  const assigneeOptions = useMemo<{ id: string; name: string }[]>(() => {
    const seen = new Map<string, string>();
    for (const e of events) {
      if (e.type === "task" && e.assigneeId && e.assigneeName) {
        seen.set(e.assigneeId, e.assigneeName);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [events]);

  function toggleType(t: CalendarEventType): void {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  const allTypesActive = typeFilter.size === ALL_TYPES.length;
  const filtersActive = !allTypesActive || !!assigneeId;
  const filterCount = (allTypesActive ? 0 : 1) + (assigneeId ? 1 : 0);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          {/* Left cluster: month nav + picker + today */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onClick={() => setMonth((m) => addMonths(m, -1))}
              aria-label="Previous month"
            >
              <ChevronLeft aria-hidden />
            </Button>

            <div ref={pickerRef} className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPickerOpen((v) => !v)}
                aria-haspopup="dialog"
                aria-expanded={pickerOpen}
                className="text-sm text-text-primary"
              >
                {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                <ChevronDown className="text-icon-tertiary" aria-hidden />
              </Button>
              {pickerOpen && (
                <div className="absolute left-0 z-30 mt-1.5 w-72 space-y-3 rounded-xl border border-card-border bg-dropdowns-background p-3.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="xs"
                      iconOnly
                      onClick={() => setMonth((m) => new Date(m.getFullYear() - 1, m.getMonth(), 1))}
                      aria-label="Previous year"
                    >
                      <ChevronLeft aria-hidden />
                    </Button>
                    <div className="text-sm leading-5 font-medium text-text-primary">
                      {month.getFullYear()}
                    </div>
                    <Button
                      variant="ghost"
                      size="xs"
                      iconOnly
                      onClick={() => setMonth((m) => new Date(m.getFullYear() + 1, m.getMonth(), 1))}
                      aria-label="Next year"
                    >
                      <ChevronRight aria-hidden />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {Array.from({ length: 12 }, (_, i) => {
                      const label = new Date(2000, i, 1).toLocaleDateString(undefined, { month: "short" });
                      const isCurrent = i === month.getMonth();
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setMonth((m) => new Date(m.getFullYear(), i, 1));
                            setPickerOpen(false);
                          }}
                          data-active={isCurrent}
                          className={cn(
                            "rounded-md py-1.5 text-sm font-medium transition-colors",
                            isCurrent
                              ? "bg-brand-500 text-white-100"
                              : "text-text-secondary hover:bg-background-gray-primary hover:text-text-primary",
                          )}
                        >{label}</button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onClick={() => setMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
            >
              <ChevronRight aria-hidden />
            </Button>

            <Button
              variant="primary"
              appearance="outline"
              size="sm"
              className="ml-1"
              onClick={() => setMonth(new Date())}
            >
              Today
            </Button>
          </div>

          {/* Right cluster: view + project + filter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Segmented view switcher */}
            <div className="flex items-center gap-1 rounded-lg bg-tab-background p-1">
              {(["month", "agenda"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  data-active={view === v}
                  className={cn(
                    "h-7 rounded-md px-3 text-sm font-medium capitalize transition-colors",
                    view === v
                      ? "bg-tab-active-background text-text-primary shadow-xs"
                      : "text-text-tertiary hover:text-text-primary",
                  )}
                >{v}</button>
              ))}
            </div>

            <div className="w-44 shrink-0">
              <NativeSelect
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                aria-label="Filter by project"
                className="h-9 text-xs"
              >
                <option value="">All projects</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </NativeSelect>
            </div>

            {/* Filter popover */}
            <div ref={filterRef} className="relative">
              <Button
                variant="primary"
                appearance="outline"
                size="sm"
                onClick={() => setFilterOpen((v) => !v)}
                aria-haspopup="dialog"
                aria-expanded={filterOpen}
                className={filtersActive ? "bg-badge-primary-background" : undefined}
              >
                <SlidersHorizontal aria-hidden />
                {filtersActive ? `Filter · ${filterCount}` : "Filter"}
              </Button>
              {filterOpen && (
                <div className="absolute top-full right-0 z-30 mt-1.5 w-64 space-y-3.5 rounded-xl border border-card-border bg-dropdowns-background p-3.5 shadow-md">
                  <Field label="Event types">
                    <div className="space-y-1.5">
                      {ALL_TYPES.map((t) => (
                        <Checkbox
                          key={t}
                          id={`calendar-type-${t}`}
                          checked={typeFilter.has(t)}
                          onChange={() => toggleType(t)}
                          label={TYPE_LABEL[t]}
                        />
                      ))}
                    </div>
                  </Field>

                  {assigneeOptions.length > 0 && typeFilter.has("task") && (
                    <Field label="Assignee">
                      <NativeSelect
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                        className="py-2 text-xs"
                      >
                        <option value="">All assignees</option>
                        {assigneeOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </NativeSelect>
                    </Field>
                  )}

                  {filtersActive && (
                    <div className="border-t border-card-border pt-2">
                      <Button
                        variant="ghost"
                        size="xs"
                        className="w-full"
                        onClick={() => {
                          setTypeFilter(new Set(ALL_TYPES));
                          setAssigneeId("");
                        }}
                      >
                        Reset filters
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {error ? (
        <Alert
          status="error"
          title="Failed to load"
          actions={
            <Button appearance="outline" size="sm" onClick={() => load()}>
              Retry
            </Button>
          }
        />
      ) : loading ? (
        <CalendarSkeleton />
      ) : view === "month" ? (
        <MonthGrid month={month} events={filtered} />
      ) : (
        <AgendaList events={filtered} />
      )}
    </div>
  );
}
