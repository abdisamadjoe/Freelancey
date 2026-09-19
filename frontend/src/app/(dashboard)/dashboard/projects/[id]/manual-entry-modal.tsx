"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import {
  Button,
  Checkbox,
  Field,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui";

export interface EditableEntry {
  id: string;
  startedAt: string;
  endedAt: string | null;
  description: string | null;
  billable: boolean;
}

interface ManualEntryModalProps {
  projectId: string;
  entry?: EditableEntry;
  onClose: () => void;
  onSaved: () => void;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function localDateParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { date, time };
}

export function ManualEntryModal({
  projectId,
  entry,
  onClose,
  onSaved,
}: ManualEntryModalProps): React.ReactElement {
  const { error: showError } = useToast();
  const isEdit = !!entry;

  const initialStart = entry
    ? localDateParts(entry.startedAt)
    : { date: new Date().toISOString().slice(0, 10), time: "09:00" };
  const initialEnd = entry?.endedAt
    ? localDateParts(entry.endedAt)
    : { date: initialStart.date, time: "10:00" };

  const [startDate, setStartDate] = useState<string>(initialStart.date);
  const [endDate, setEndDate] = useState<string>(initialEnd.date);
  const [start, setStart] = useState<string>(initialStart.time);
  const [end, setEnd] = useState<string>(initialEnd.time);
  const [description, setDescription] = useState<string>(entry?.description ?? "");
  const [billable, setBillable] = useState<boolean>(entry?.billable ?? true);
  const [busy, setBusy] = useState<boolean>(false);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const startedAt = new Date(`${startDate}T${start}:00`);
    const endedAt = new Date(`${endDate}T${end}:00`);
    if (endedAt.getTime() <= startedAt.getTime()) {
      showError("End must be after start");
      return;
    }
    setBusy(true);
    try {
      if (isEdit && entry) {
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
      showError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} size="md">
      <form onSubmit={submit}>
        <ModalHeader title={isEdit ? "Edit time entry" : "Add time entry"} />

        <ModalBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Start date" htmlFor="manual-entry-start-date">
              <Input
                id="manual-entry-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (endDate < e.target.value) setEndDate(e.target.value);
                }}
                required
              />
            </Field>
            <Field label="End date" htmlFor="manual-entry-end-date">
              <Input
                id="manual-entry-end-date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Start time" htmlFor="manual-entry-start-time">
              <Input
                id="manual-entry-start-time"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </Field>
            <Field label="End time" htmlFor="manual-entry-end-time">
              <Input
                id="manual-entry-end-time"
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </Field>
          </div>

          <Field label="Description" htmlFor="manual-entry-description">
            <Input
              id="manual-entry-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you work on?"
            />
          </Field>

          <Checkbox
            id="manual-entry-billable"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
            label="Billable"
          />
        </ModalBody>

        <ModalFooter>
          <Button type="button" appearance="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
