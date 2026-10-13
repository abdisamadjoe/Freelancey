"use client";

import {
  ActionButton,
  CheckInput,
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
import { Button } from "@/components/tailgrids/core/button";
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

interface EditableEntry {
  id: string;
  startedAt: string;
  endedAt: string | null;
  description: string | null;
  billable: boolean;
}

/** `<input type="datetime-local">` value for an ISO timestamp. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ManualEntryModal({
  projectId,
  entry,
  onClose,
  onSaved,
}: {
  projectId: string;
  entry?: EditableEntry;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [start, setStart] = useState(toLocalInput(entry?.startedAt ?? null));
  const [end, setEnd] = useState(toLocalInput(entry?.endedAt ?? null));
  const [description, setDescription] = useState(entry?.description ?? "");
  const [billable, setBillable] = useState(entry?.billable ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    const startedAt = new Date(start);
    const endedAt = new Date(end);
    if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
      setError("Enter a start and end time.");
      return;
    }
    if (endedAt <= startedAt) {
      setError("The end time must be after the start time.");
      return;
    }
    setBusy(true);
    try {
      if (entry) {
        await apiFetch(`/time-entries/${entry.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            startedAt: startedAt.toISOString(),
            endedAt: endedAt.toISOString(),
            description: description || null,
            billable,
          }),
        });
      } else {
        await apiFetch("/time-entries", {
          method: "POST",
          body: JSON.stringify({
            projectId,
            startedAt: startedAt.toISOString(),
            endedAt: endedAt.toISOString(),
            description: description || undefined,
            billable,
          }),
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the entry");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={entry ? "Edit time entry" : "Add time entry"}
      footer={
        <>
          <Button appearance="outline" variant="primary" onPress={onClose}>
            Cancel
          </Button>
          <ActionButton variant="primary" loading={busy} onPress={save}>
            {entry ? "Save" : "Add entry"}
          </ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-error-500">{error}</p>}
        <TextInput label="Start" type="datetime-local" value={start} onChange={setStart} required />
        <TextInput label="End" type="datetime-local" value={end} onChange={setEnd} required />
        <TextInput label="Description" value={description} onChange={setDescription} />
        <CheckInput checked={billable} onChange={setBillable} label="Billable" />
      </div>
    </Modal>
  );
}

function GenerateFromTimeModal({ projectId, onClose, onCreated }: { projectId: string; onClose: () => void; onCreated: () => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includeNonBillable, setIncludeNonBillable] = useState(false);
  const [mergeEntries, setMergeEntries] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const body: Record<string, unknown> = { projectId, includeNonBillable, mergeEntries };
      if (from) body.from = new Date(from).toISOString();
      if (to) body.to = new Date(`${to}T23:59:59`).toISOString();
      await apiFetch<{ invoiceId: string }>("/time-entries/generate-invoice", { method: "POST", body: JSON.stringify(body) });
      toast.success("Draft invoice created from time entries");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the invoice");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Invoice time entries"
      description="Creates a draft invoice from billable time that has not been invoiced yet."
      footer={
        <>
          <Button appearance="outline" variant="primary" onPress={onClose}>
            Cancel
          </Button>
          <ActionButton variant="primary" loading={busy} onPress={run}>
            Create draft invoice
          </ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <TextInput label="From" type="date" value={from} onChange={setFrom} />
        <TextInput label="To" type="date" value={to} onChange={setTo} />
        <CheckInput checked={includeNonBillable} onChange={setIncludeNonBillable} label="Include non-billable entries" />
        <CheckInput checked={mergeEntries} onChange={setMergeEntries} label="Merge entries into one line per person" />
      </div>
    </Modal>
  );
}

export function TimeTab({ projectId, isArchived }: { projectId: string; isArchived?: boolean }) {
  const { confirm, dialog } = useConfirm();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [modal, setModal] = useState<{ mode: "closed" } | { mode: "new" } | { mode: "edit"; entry: EditableEntry }>({ mode: "closed" });
  const [invoiceOpen, setInvoiceOpen] = useState(false);
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
              <Button size="sm" appearance="outline" variant="primary" onPress={() => setInvoiceOpen(true)}>
                Invoice time
              </Button>
              <Button size="sm" variant="primary" onPress={() => setModal({ mode: "new" })}>
                Add entry
              </Button>
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
                          setModal({
                            mode: "edit",
                            entry: { id: e.id, startedAt: e.startedAt, endedAt: e.endedAt, description: e.description, billable: e.billable },
                          })
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

      {modal.mode !== "closed" && (
        <ManualEntryModal
          projectId={projectId}
          entry={modal.mode === "edit" ? modal.entry : undefined}
          onClose={() => setModal({ mode: "closed" })}
          onSaved={load}
        />
      )}
      {invoiceOpen && <GenerateFromTimeModal projectId={projectId} onClose={() => setInvoiceOpen(false)} onCreated={load} />}
      {dialog}
    </>
  );
}
