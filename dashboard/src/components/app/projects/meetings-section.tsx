"use client";

import { ActionButton, Empty, fmtDateTime, FormGrid, Loading, Panel, TextAreaInput, TextInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import type { Meeting } from "@/lib/workflow";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const BLANK = { title: "", scheduledAt: "", durationMin: "", location: "", notes: "" };

export function MeetingsSection({ projectId, isArchived }: { projectId: string; isArchived: boolean }) {
  const [rows, setRows] = useState<Meeting[] | null>(null);
  const [f, setF] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRows(await apiFetch<Meeting[]>(`/projects/${projectId}/meetings`).catch(() => []));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiFetch(`/projects/${projectId}/meetings`, {
        method: "POST",
        body: JSON.stringify({
          title: f.title,
          scheduledAt: new Date(f.scheduledAt).toISOString(),
          durationMin: f.durationMin ? parseInt(f.durationMin, 10) : undefined,
          location: f.location.trim() || undefined,
          notes: f.notes.trim() || undefined,
        }),
      });
      setF(BLANK);
      toast.success("Meeting added");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the meeting");
    } finally {
      setBusy(false);
    }
  }

  async function remove(m: Meeting) {
    if (!window.confirm(`Delete "${m.title}"?`)) return;
    try {
      await apiFetch(`/projects/${projectId}/meetings/${m.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  return (
    <>
      {!isArchived && (
        <Panel title="Add a meeting">
          <form onSubmit={create} className="space-y-4">
            <FormGrid>
              <TextInput label="Title" required value={f.title} onChange={(v) => setF((s) => ({ ...s, title: v }))} />
              <TextInput label="When" type="datetime-local" required value={f.scheduledAt} onChange={(v) => setF((s) => ({ ...s, scheduledAt: v }))} />
              <TextInput label="Length (minutes)" type="number" min={1} value={f.durationMin} onChange={(v) => setF((s) => ({ ...s, durationMin: v }))} />
              <TextInput label="Where" value={f.location} onChange={(v) => setF((s) => ({ ...s, location: v }))} placeholder="Zoom, office, phone..." />
            </FormGrid>
            <TextAreaInput label="Notes" rows={2} value={f.notes} onChange={(v) => setF((s) => ({ ...s, notes: v }))} />
            <ActionButton type="submit" variant="primary" loading={busy} isDisabled={!f.title.trim() || !f.scheduledAt}>
              Add meeting
            </ActionButton>
          </form>
        </Panel>
      )}

      <Panel title="Meetings">
        {rows === null ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty>No meetings logged yet.</Empty>
        ) : (
          <ul className="divide-y divide-card-border">
            {rows.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">{m.title}</p>
                  <p className="text-xs text-text-tertiary">
                    {fmtDateTime(m.scheduledAt)}
                    {m.durationMin ? ` · ${m.durationMin} min` : ""}
                    {m.location ? ` · ${m.location}` : ""}
                  </p>
                  {m.notes && <p className="mt-1 text-sm whitespace-pre-wrap text-text-secondary">{m.notes}</p>}
                </div>
                {!isArchived && (
                  <Button size="sm" variant="danger" appearance="ghost" onPress={() => remove(m)}>
                    Delete
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
