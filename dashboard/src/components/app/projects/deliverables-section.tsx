"use client";

import { ActionButton, CheckInput, Empty, fmtDate, FormGrid, Loading, Notice, Panel, SelectInput, StatusBadge, TextAreaInput, TextInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { DELIVERABLE_STATUS_COLOR, DELIVERABLE_STATUS_LABEL, type DeliverableList, type DeliverableRow, type Milestone } from "@/lib/workflow";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const BLANK = { title: "", description: "", milestoneId: "", linkLabel: "", linkUrl: "" };

/** Deliverables the client reviews from a secure link. */
export function DeliverablesSection({ projectId, clientEmail, isArchived }: { projectId: string; clientEmail: boolean; isArchived: boolean }) {
  const [list, setList] = useState<DeliverableList | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [f, setF] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [emailIt, setEmailIt] = useState(clientEmail);
  const [links, setLinks] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setList(
      await apiFetch<DeliverableList>(`/projects/${projectId}/deliverables`).catch(() => ({
        data: [],
        revisions: { used: 0, allowed: null },
        overLimit: false,
      })),
    );
  }, [projectId]);

  useEffect(() => {
    load();
    apiFetch<Milestone[]>(`/projects/${projectId}/milestones`).then(setMilestones).catch(() => setMilestones([]));
  }, [load, projectId]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiFetch(`/projects/${projectId}/deliverables`, {
        method: "POST",
        body: JSON.stringify({
          title: f.title,
          description: f.description.trim() || undefined,
          milestoneId: f.milestoneId || undefined,
          links: f.linkUrl.trim() ? [{ label: f.linkLabel.trim() || "View", url: f.linkUrl.trim() }] : undefined,
        }),
      });
      setF(BLANK);
      toast.success("Deliverable drafted");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the deliverable");
    } finally {
      setBusy(false);
    }
  }

  async function send(d: DeliverableRow) {
    try {
      const res = await apiFetch<{ link: string; emailed: boolean; version: number }>(`/projects/${projectId}/deliverables/${d.id}/send`, {
        method: "POST",
        body: JSON.stringify({ email: emailIt && clientEmail }),
      });
      setLinks((prev) => ({ ...prev, [d.id]: res.link }));
      toast.success(res.emailed ? `Version ${res.version} emailed` : `Version ${res.version} ready to share`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    }
  }

  async function remove(d: DeliverableRow) {
    if (!window.confirm(`Delete "${d.title}"?`)) return;
    try {
      await apiFetch(`/projects/${projectId}/deliverables/${d.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed. Select the link and copy it by hand.");
    }
  }

  return (
    <>
      {list && list.revisions.allowed !== null && (
        <Notice status={list.overLimit ? "warning" : "info"}>
          Revisions: {list.revisions.used} of {list.revisions.allowed} used.{" "}
          {list.overLimit
            ? "The client has asked for more changes than the contract includes. Extra rounds are quoted separately."
            : "That is what the signed contract includes."}
        </Notice>
      )}

      {!isArchived && (
        <Panel title="New deliverable">
          <form onSubmit={create} className="space-y-4">
            <FormGrid>
              <TextInput label="Title" required value={f.title} onChange={(v) => setF((s) => ({ ...s, title: v }))} placeholder="e.g. Homepage design" />
              <SelectInput
                label="Milestone"
                value={f.milestoneId}
                onChange={(v) => setF((s) => ({ ...s, milestoneId: v }))}
                options={[{ value: "", label: "None" }, ...milestones.map((m) => ({ value: m.id, label: m.title }))]}
              />
              <TextInput label="Link label" value={f.linkLabel} onChange={(v) => setF((s) => ({ ...s, linkLabel: v }))} placeholder="Figma, staging site..." />
              <TextInput label="Link" type="url" value={f.linkUrl} onChange={(v) => setF((s) => ({ ...s, linkUrl: v }))} placeholder="https://" />
            </FormGrid>
            <TextAreaInput label="What should they look at?" rows={3} value={f.description} onChange={(v) => setF((s) => ({ ...s, description: v }))} />
            <ActionButton type="submit" variant="primary" loading={busy} isDisabled={!f.title.trim()}>
              Create deliverable
            </ActionButton>
          </form>
        </Panel>
      )}

      <Panel
        title="Deliverables"
        action={clientEmail ? <CheckInput checked={emailIt} onChange={setEmailIt} label="Email when sending" /> : undefined}
      >
        {list === null ? (
          <Loading />
        ) : list.data.length === 0 ? (
          <Empty>Nothing to review yet. Draft a deliverable above and send it to the client.</Empty>
        ) : (
          <ul className="divide-y divide-card-border">
            {list.data.map((d) => (
              <li key={d.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">
                      {d.title} <span className="text-xs text-text-tertiary">v{d.version}</span>
                    </p>
                    {d.description && <p className="text-sm text-text-secondary">{d.description}</p>}
                    <div className="mt-1 flex flex-wrap gap-3">
                      {d.links.map((l) => (
                        <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="text-sm text-neutral-brand-color hover:underline">
                          {l.label}
                        </a>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge color={DELIVERABLE_STATUS_COLOR[d.status] ?? "gray"}>{DELIVERABLE_STATUS_LABEL[d.status] ?? d.status}</StatusBadge>
                    {!isArchived && d.status !== "approved" && (
                      <Button size="sm" variant="primary" onPress={() => send(d)}>
                        {d.status === "draft" ? "Send" : "Send new version"}
                      </Button>
                    )}
                    {!isArchived && d.status === "draft" && (
                      <Button size="sm" variant="danger" appearance="ghost" onPress={() => remove(d)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
                {d.status === "approved" && (
                  <p className="text-xs text-text-tertiary">
                    Approved by {d.approvedByName}
                    {d.approvedAt ? ` on ${fmtDate(d.approvedAt)}` : ""}
                  </p>
                )}
                {d.changeRequests.map((c) => (
                  <div key={c.id} className="rounded-md border border-card-border p-3">
                    <p className="text-xs text-text-tertiary">
                      Changes requested on v{c.version} · {fmtDate(c.createdAt)}
                      {c.status === "resolved" ? " · answered" : ""}
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-wrap text-text-primary">{c.message}</p>
                  </div>
                ))}
                {links[d.id] && (
                  <div className="flex flex-wrap items-center gap-2 rounded-md border border-card-border p-3">
                    <code className="min-w-0 flex-1 text-xs break-all text-text-primary">{links[d.id]}</code>
                    <Button size="sm" appearance="outline" variant="primary" onPress={() => copy(links[d.id])}>
                      Copy link
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
