"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/confirm-modal";
import { formatDuration, formatHours } from "@/lib/format-duration";
import { Clock, Play, Square, Plus, Trash2, Lock, Pencil, TimerReset } from "lucide-react";
import { ManualEntryModal, type EditableEntry } from "./manual-entry-modal";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  DataToolbar,
  EmptyState,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  StatCard,
  TableRowSkeleton,
} from "@/components/ui";

type ModalState = { mode: "closed" } | { mode: "new" } | { mode: "edit"; entry: EditableEntry };

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

interface EntryListResponse {
  data: Entry[];
}

interface TimeTabProps {
  projectId: string;
  isArchived?: boolean;
}

export function TimeTab({ projectId, isArchived }: TimeTabProps): React.ReactElement {
  const { success, error: showError } = useToast();
  const confirm = useConfirm();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [now, setNow] = useState<number>(() => Date.now());
  const [draftDescription, setDraftDescription] = useState<string>("");
  const [timerBusy, setTimerBusy] = useState<boolean>(false);
  const [stopPrompt, setStopPrompt] = useState<{ description: string } | null>(null);

  const runningEntry = entries.find((e) => !e.endedAt);
  const hasRunning = !!runningEntry;
  useEffect(() => {
    if (!hasRunning) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasRunning]);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiFetch<EntryListResponse>(
        `/time-entries?projectId=${projectId}&limit=200`,
      );
      setEntries(res.data);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Could not load time entries";
      setLoadError(msg);
      showError("Could not load time entries — try again");
    } finally {
      setLoading(false);
    }
  }, [projectId, showError]);

  useEffect(() => {
    load();
  }, [load]);

  async function startTimer(): Promise<void> {
    if (timerBusy) return;
    setTimerBusy(true);
    try {
      const running = await apiFetch<{
        id: string;
        project: { id: string; name: string };
      } | null>("/time-entries/running");
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
        body: JSON.stringify({
          projectId,
          ...(description ? { description } : {}),
        }),
      });
      setDraftDescription("");
      success("Timer started");
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to start timer");
    } finally {
      setTimerBusy(false);
    }
  }

  async function stopTimer(description: string): Promise<void> {
    if (timerBusy || !runningEntry) return;
    setTimerBusy(true);
    try {
      const trimmed = description.trim();
      const current = runningEntry.description ?? "";
      if (trimmed !== current) {
        await apiFetch(`/time-entries/${runningEntry.id}`, {
          method: "PATCH",
          body: JSON.stringify({ description: trimmed || null }),
        });
      }
      await apiFetch("/time-entries/stop", { method: "POST" });
      setStopPrompt(null);
      success("Timer stopped");
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to stop timer");
    } finally {
      setTimerBusy(false);
    }
  }

  async function saveRunningDescription(value: string): Promise<void> {
    if (!runningEntry) return;
    if ((runningEntry.description ?? "") === value) return;
    try {
      await apiFetch(`/time-entries/${runningEntry.id}`, {
        method: "PATCH",
        body: JSON.stringify({ description: value || null }),
      });
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save description");
    }
  }

  async function deleteEntry(id: string): Promise<void> {
    const ok = await confirm({
      title: "Delete time entry?",
      message: "This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiFetch(`/time-entries/${id}`, { method: "DELETE" });
      success("Entry deleted");
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete entry");
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

  const showSkeleton = loading && entries.length === 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <StatCard title="Total" value={`${formatHours(totals.total)}h`} icon={Clock} />
        <StatCard
          title="Billable"
          value={`${formatHours(totals.billable)}h`}
          icon={TimerReset}
          tone="green"
        />
      </div>

      <Card className="overflow-hidden p-0">
        <CardHeader className="px-5 py-4">
          <CardTitle>Time entries</CardTitle>
        </CardHeader>

        {!isArchived && (
          <DataToolbar
            trailing={
              <Button onClick={() => setModal({ mode: "new" })}>
                <Plus />
                Add entry
              </Button>
            }
          >
            {hasRunning && runningEntry ? (
              <>
                <Input
                  key={runningEntry.id}
                  type="text"
                  defaultValue={runningEntry.description ?? ""}
                  onBlur={(e) => saveRunningDescription(e.target.value.trim())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  placeholder="What are you working on?"
                  className="w-full sm:w-56"
                />
                <Button
                  variant="danger"
                  appearance="outline"
                  onClick={() => setStopPrompt({ description: runningEntry.description ?? "" })}
                  disabled={timerBusy}
                  title="Stop timer"
                >
                  <Square />
                  Stop timer
                </Button>
              </>
            ) : (
              <>
                <Input
                  type="text"
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      startTimer();
                    }
                  }}
                  placeholder="What are you working on?"
                  className="w-full sm:w-56"
                />
                <Button appearance="outline" onClick={startTimer} disabled={timerBusy}>
                  <Play />
                  Start timer
                </Button>
              </>
            )}
          </DataToolbar>
        )}

        {loadError ? (
          <div className="px-5 py-4">
            <Alert
              status="error"
              title="Could not load time entries"
              actions={
                <Button appearance="outline" size="sm" onClick={() => load()}>
                  Retry
                </Button>
              }
            >
              {loadError}
            </Alert>
          </div>
        ) : showSkeleton ? (
          <div>
            {Array.from({ length: 3 }).map((_, index) => (
              <TableRowSkeleton key={index} columns={3} />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={<Clock className="size-5" aria-hidden />}
            title="No time logged on this project yet."
            className="py-10"
          />
        ) : (
          <div className="divide-y divide-border-primary">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-medium text-text-primary">
                      {e.endedAt
                        ? formatDuration(e.durationSec ?? 0)
                        : formatDuration(Math.floor((now - new Date(e.startedAt).getTime()) / 1000))}
                    </span>
                    {!e.endedAt && (
                      <Badge color="error">
                        <span className="size-1.5 animate-pulse rounded-full bg-current" />
                        running
                      </Badge>
                    )}
                    {e.billable && <Badge color="success">billable</Badge>}
                    {e.invoiceLineItemId && (
                      <Lock
                        size={12}
                        className="text-icon-tertiary"
                        aria-label="Invoiced (locked)"
                      />
                    )}
                  </div>
                  <div className="truncate text-xs text-text-tertiary">
                    {new Date(e.startedAt).toLocaleString()} · {e.user.name}
                    {e.task && ` · ${e.task.title}`}
                    {e.description && ` · ${e.description}`}
                  </div>
                </div>
                {!e.invoiceLineItemId && !isArchived && e.endedAt && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      appearance="ghost"
                      size="xs"
                      iconOnly
                      onClick={() => setModal({
                        mode: "edit",
                        entry: {
                          id: e.id,
                          startedAt: e.startedAt,
                          endedAt: e.endedAt,
                          description: e.description,
                          billable: e.billable,
                        },
                      })}
                      title="Edit"
                      aria-label="Edit entry"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="danger"
                      appearance="ghost"
                      size="xs"
                      iconOnly
                      onClick={() => deleteEntry(e.id)}
                      title="Delete"
                      aria-label="Delete entry"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {modal.mode !== "closed" && (
        <ManualEntryModal
          projectId={projectId}
          entry={modal.mode === "edit" ? modal.entry : undefined}
          onClose={() => setModal({ mode: "closed" })}
          onSaved={() => {
            setModal({ mode: "closed" });
            load();
          }}
        />
      )}

      {stopPrompt && runningEntry && (
        <StopTimerModal
          elapsedSec={Math.floor((now - new Date(runningEntry.startedAt).getTime()) / 1000)}
          initialDescription={stopPrompt.description}
          busy={timerBusy}
          onCancel={() => setStopPrompt(null)}
          onStop={(desc) => stopTimer(desc)}
        />
      )}
    </div>
  );
}

interface StopTimerModalProps {
  elapsedSec: number;
  initialDescription: string;
  busy: boolean;
  onCancel: () => void;
  onStop: (description: string) => void;
}

function StopTimerModal({
  elapsedSec,
  initialDescription,
  busy,
  onCancel,
  onStop,
}: StopTimerModalProps): React.ReactElement {
  const [description, setDescription] = useState<string>(initialDescription);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function submit(e: React.FormEvent): void {
    e.preventDefault();
    onStop(description);
  }

  return (
    <Modal open onClose={onCancel} size="md">
      <form onSubmit={submit}>
        <ModalHeader title="Stop timer" />
        <ModalBody className="space-y-4">
          <p className="text-sm text-text-tertiary">
            Elapsed:{" "}
            <span className="font-mono font-medium text-text-primary">
              {formatDuration(elapsedSec)}
            </span>
          </p>
          <div>
            <label
              htmlFor="stop-timer-description"
              className="mb-1.5 block text-sm font-medium text-input-label-text-color"
            >
              Description
            </label>
            <Input
              id="stop-timer-description"
              ref={inputRef}
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" appearance="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={busy}>
            {busy ? "Stopping…" : "Stop"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
