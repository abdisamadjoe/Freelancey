"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Button, Card, CardHeader, CardTitle, EmptyState, Field, Input, Textarea } from "@/components/ui";
import type { Meeting } from "@/lib/workflow";

export function MeetingsSection({ projectId, isArchived }: { projectId: string; isArchived: boolean }) {
  const { success, error: showError } = useToast();
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [f, setF] = useState({ title: "", scheduledAt: "", durationMin: "", location: "", notes: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setMeetings(await apiFetch<Meeting[]>(`/projects/${projectId}/meetings`).catch(() => []));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((prev) => ({ ...prev, [key]: e.target.value }));

  async function add(e: React.FormEvent) {
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
      setF({ title: "", scheduledAt: "", durationMin: "", location: "", notes: "" });
      success("Meeting added");
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not add the meeting");
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
      showError(err instanceof Error ? err.message : "Could not delete");
    }
  }

  return (
    <div className="space-y-5">
      {!isArchived && (
        <Card>
          <CardHeader>
            <CardTitle>Log a meeting</CardTitle>
          </CardHeader>
          <form onSubmit={add} className="space-y-4 p-5 pt-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" htmlFor="m-title" required>
                <Input id="m-title" value={f.title} onChange={set("title")} maxLength={200} required />
              </Field>
              <Field label="When" htmlFor="m-when" required>
                <Input id="m-when" type="datetime-local" value={f.scheduledAt} onChange={set("scheduledAt")} required />
              </Field>
              <Field label="Duration (minutes)" htmlFor="m-dur">
                <Input id="m-dur" type="number" min="1" max="1440" value={f.durationMin} onChange={set("durationMin")} />
              </Field>
              <Field label="Place or call link" htmlFor="m-loc">
                <Input id="m-loc" value={f.location} onChange={set("location")} maxLength={500} />
              </Field>
            </div>
            <Field label="Notes" htmlFor="m-notes">
              <Textarea id="m-notes" rows={3} value={f.notes} onChange={set("notes")} maxLength={10000} />
            </Field>
            <Button type="submit" iconOnly={false} loading={busy} disabled={!f.title.trim() || !f.scheduledAt}>
              <Plus />
              <span>Add meeting</span>
            </Button>
          </form>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Meetings</CardTitle>
        </CardHeader>
        {meetings === null ? (
          <p className="px-5 pb-5 text-sm text-text-tertiary">Loading...</p>
        ) : meetings.length === 0 ? (
          <EmptyState variant="plain" icon={<CalendarDays className="size-5" aria-hidden />} title="No meetings yet" description="Log calls and meetings with the client, with notes." />
        ) : (
          <ul className="divide-y divide-card-border border-t border-card-border">
            {meetings.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">{m.title}</p>
                  <p className="text-xs text-text-tertiary">
                    {new Date(m.scheduledAt).toLocaleString()}
                    {m.durationMin ? ` · ${m.durationMin} min` : ""}
                    {m.location ? ` · ${m.location}` : ""}
                  </p>
                  {m.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">{m.notes}</p>}
                </div>
                {!isArchived && (
                  <Button type="button" size="sm" appearance="ghost" aria-label={`Delete ${m.title}`} onClick={() => remove(m)}>
                    <Trash2 />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
