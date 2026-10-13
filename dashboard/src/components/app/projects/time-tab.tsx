"use client";

import {
  ActionButton,
  Empty,
  ErrorNote,
  fmtDateTime,
  Loading,
  Modal,
  Panel,
  StatCard,
  StatGrid,
  StatusBadge,
  TextInput,
  useConfirm,
} from "@/components/app/kit";
import { Button, buttonStyles } from "@/components/tailgrids/core/button";
import { type EditableEntry, TimeEntryForm } from "@/components/app/projects/time-entry-form";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatDuration, formatHours } from "@/lib/format-duration";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Entry {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number | null;
  description: string | null;
  billable: boolean;
  invoiceLineItemId: string | null;
  user: { name: string };
  task: { id: string; title: string } | null;
}

function EditEntryModal({
  projectId,
  entry,
  onClose,
  onSaved,
}: {
  projectId: string;
  entry: EditableEntry;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Modal open onClose={onClose} title="Edit time entry">
      <TimeEntryForm
        projectId={projectId}
        entry={entry}
        onCancel={onClose}
        onSaved={() => {
          onSaved();
          onClose();
        }}
      />
    </Modal>
  );
}

export function TimeTab({ projectId, isArchived }: { projectId: string; isArchived?: boolean }) {
  const { confirm, dialog } = useConfirm();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [editing, setEditing] = useState<EditableEntry | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [draftDescription, setDraftDescription] = useState("");
  const [timerBusy, setTimerBusy] = useState(false);

  const runningEntry = entries.find((e) => !e.endedAt);

  useEffect(() => {
    if (!runningEntry) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [runningEntry]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiFetch<{ data: Entry[] }>(`/time-entries?projectId=${projectId}&limit=200`);
      setEntries(res.data);
    } catch (err) {
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function startTimer() {
    if (timerBusy) return;
    setTimerBusy(true);
    try {
      const running = await apiFetch<{ id: string; project: { id: string; name: string } } | null>("/time-entries/running");
      if (running && running.project.id !== projectId) {
        const ok = await confirm({
          title: "Stop running timer?",
          message: `A timer is currently running on "${running.project.name}". Starting a new timer here will stop it.`,
          confirmLabel: "Stop and start",
        });
        if (!ok) return;
      }
      const description = draftDescription.trim();
      await apiFetch("/time-entries/start", {
        method: "POST",
        body: JSON.stringify({ projectId, ...(description ? { description } : {}) }),
      });
      setDraftDescription("");
      toast.success("Timer started");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start timer");
    } finally {
      setTimerBusy(false);
    }
  }

  async function stopTimer() {
    if (timerBusy || !runningEntry) return;
    setTimerBusy(true);
    try {
      await apiFetch("/time-entries/stop", { method: "POST" });
      toast.success("Timer stopped");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to stop timer");
    } finally {
      setTimerBusy(false);
    }
  }

  async function saveRunningDescription(value: string) {
    if (!runningEntry || (runningEntry.description ?? "") === value) return;
    try {
      await apiFetch(`/time-entries/${runningEntry.id}`, { method: "PATCH", body: JSON.stringify({ description: value || null }) });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save description");
    }
  }

  async function deleteEntry(id: string) {
    const ok = await confirm({ title: "Delete time entry?", message: "This cannot be undone.", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    try {
      await apiFetch(`/time-entries/${id}`, { method: "DELETE" });
      toast.success("Entry deleted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete entry");
    }
  }

  const totals = entries.reduce(
    (acc, e) => {
      const sec = e.durationSec ?? 0;
      acc.total += sec;
      if (e.billable) acc.billable += sec;
      return acc;
    },
    { total: 0, billable: 0 },
  );

  return (
    <>
      <StatGrid>
        <StatCard label="Total" value={`${formatHours(totals.total)}h`} />
        <StatCard label="Billable" value={`${formatHours(totals.billable)}h`} />
      </StatGrid>

      <Panel
        flush
        title="Time entries"
        action={
          !isArchived && (
            <>
              <Link
                href={`/dashboard/projects/${projectId}/time/invoice`}
                className={buttonStyles({ size: "sm", appearance: "outline", variant: "primary" })}
              >
                Invoice time
              </Link>
              <Link href={`/dashboard/projects/${projectId}/time/new`} className={buttonStyles({ size: "sm" })}>
                Add entry
              </Link>
            </>
          )
        }
      >
        {!isArchived && (
          <div className="flex flex-wrap items-end gap-3 border-t border-card-border px-5 py-4">
            {runningEntry ? (
              <>
                <div className="w-full sm:w-64">
                  <input
                    key={runningEntry.id}
                    type="text"
                    defaultValue={runningEntry.description ?? ""}
                    onBlur={(e) => saveRunningDescription(e.target.value.trim())}
                    placeholder="What are you working on?"
                    className="h-10 w-full rounded-lg border border-card-border bg-input-background px-3 text-sm text-title-50 outline-none focus:border-input-primary-focus-border"
                  />
                </div>
                <ActionButton variant="danger" appearance="outline" loading={timerBusy} onPress={stopTimer}>
                  Stop timer
                </ActionButton>
              </>
            ) : (
              <>
                <div className="w-full sm:w-64">
                  <TextInput value={draftDescription} onChange={setDraftDescription} placeholder="What are you working on?" />
                </div>
                <ActionButton appearance="outline" variant="primary" loading={timerBusy} onPress={startTimer}>
                  Start timer
                </ActionButton>
              </>
            )}
          </div>
        )}

        <div className="border-t border-card-border">
          {loadError ? (
            <div className="px-5">
              <ErrorNote error={loadError} onRetry={load} />
            </div>
          ) : loading && entries.length === 0 ? (
            <Loading />
          ) : entries.length === 0 ? (
            <Empty>No time logged on this project yet.</Empty>
          ) : (
            <ul className="divide-y divide-card-border">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-numeric text-sm font-medium text-text-primary tabular-nums">
                        {e.endedAt
                          ? formatDuration(e.durationSec ?? 0)
                          : formatDuration(Math.floor((now - new Date(e.startedAt).getTime()) / 1000))}
                      </span>
                      {!e.endedAt && <StatusBadge color="error">running</StatusBadge>}
                      {e.billable && <StatusBadge color="success">billable</StatusBadge>}
                      {e.invoiceLineItemId && <StatusBadge color="gray">invoiced</StatusBadge>}
                    </div>
                    <div className="truncate text-xs text-text-tertiary">
                      {fmtDateTime(e.startedAt)} · {e.user.name}
                      {e.task && ` · ${e.task.title}`}
                      {e.description && ` · ${e.description}`}
                    </div>
                  </div>
                  {!e.invoiceLineItemId && !isArchived && e.endedAt && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="xs"
                        variant="ghost"
                        onPress={() =>
                          setEditing({ id: e.id, startedAt: e.startedAt, endedAt: e.endedAt, description: e.description, billable: e.billable })
                        }
                      >
                        Edit
                      </Button>
                      <Button size="xs" variant="danger" appearance="ghost" onPress={() => deleteEntry(e.id)}>
                        Delete
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      {editing && <EditEntryModal projectId={projectId} entry={editing} onClose={() => setEditing(null)} onSaved={load} />}
      {dialog}
    </>
  );
}
