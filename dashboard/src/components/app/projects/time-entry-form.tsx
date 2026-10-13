"use client";

import { ActionButton, CheckInput, TextInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { useState } from "react";

export interface EditableEntry {
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

/** Add a time entry by hand, or edit an existing one when `entry` is passed. */
export function TimeEntryForm({
  projectId,
  entry,
  onCancel,
  onSaved,
}: {
  projectId: string;
  entry?: EditableEntry;
  onCancel: () => void;
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the entry");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-error-500">{error}</p>}
      <TextInput label="Start" type="datetime-local" value={start} onChange={setStart} required />
      <TextInput label="End" type="datetime-local" value={end} onChange={setEnd} required />
      <TextInput label="Description" value={description} onChange={setDescription} />
      <CheckInput checked={billable} onChange={setBillable} label="Billable" />
      <div className="flex flex-wrap justify-end gap-2 border-t border-card-border pt-4">
        <Button appearance="outline" variant="primary" onPress={onCancel}>
          Cancel
        </Button>
        <ActionButton variant="primary" loading={busy} onPress={save}>
          {entry ? "Save" : "Add entry"}
        </ActionButton>
      </div>
    </div>
  );
}
