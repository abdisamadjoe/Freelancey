"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, PackageCheck, Plus, Send, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  Field,
  Input,
  NativeSelect,
  Textarea,
} from "@/components/ui";
import {
  DELIVERABLE_STATUS_COLOR,
  DELIVERABLE_STATUS_LABEL,
  type DeliverableList,
  type DeliverableRow,
  type Milestone,
} from "@/lib/workflow";

interface Props {
  projectId: string;
  clientEmail: boolean;
  isArchived: boolean;
}

const BLANK = { title: "", description: "", milestoneId: "", linkLabel: "", linkUrl: "" };

/** Deliverables the client reviews from a secure link. Staff only. */
export function DeliverablesSection({ projectId, clientEmail, isArchived }: Props) {
  const { success, error: showError } = useToast();
  const [list, setList] = useState<DeliverableList | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [f, setF] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [emailIt, setEmailIt] = useState(clientEmail);
  const [links, setLinks] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setList(await apiFetch<DeliverableList>(`/projects/${projectId}/deliverables`).catch(() => ({ data: [], revisions: { used: 0, allowed: null }, overLimit: false })));
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
      success("Deliverable drafted");
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not create the deliverable");
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
      success(res.emailed ? `Version ${res.version} emailed` : `Version ${res.version} ready to share`);
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not send");
    }
  }

  async function remove(d: DeliverableRow) {
    if (!window.confirm(`Delete "${d.title}"?`)) return;
    try {
      await apiFetch(`/projects/${projectId}/deliverables/${d.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not delete");
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      success("Link copied");
    } catch {
      showError("Copy failed. Select the link and copy it by hand.");
    }
  }

  return (
    <div className="space-y-5">
      {list && list.revisions.allowed !== null && (
        <Alert status={list.overLimit ? "warning" : "info"} title={`Revisions: ${list.revisions.used} of ${list.revisions.allowed} used`}>
          {list.overLimit
            ? "The client has asked for more changes than the contract includes. Extra rounds are quoted separately."
            : "That is what the signed contract includes."}
        </Alert>
      )}

      {!isArchived && (
        <Card>
          <CardHeader>
            <CardTitle>New deliverable</CardTitle>
          </CardHeader>
          <form onSubmit={create} className="space-y-4 p-5 pt-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" htmlFor="dl-title" required>
                <Input id="dl-title" value={f.title} onChange={(e) => setF((v) => ({ ...v, title: e.target.value }))} maxLength={200} required placeholder="e.g. Homepage design" />
              </Field>
              <Field label="Milestone" htmlFor="dl-ms">
                <NativeSelect id="dl-ms" value={f.milestoneId} onChange={(e) => setF((v) => ({ ...v, milestoneId: e.target.value }))}>
                  <option value="">None</option>
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Link label" htmlFor="dl-label">
                <Input id="dl-label" value={f.linkLabel} onChange={(e) => setF((v) => ({ ...v, linkLabel: e.target.value }))} maxLength={100} placeholder="Figma, staging site..." />
              </Field>
              <Field label="Link" htmlFor="dl-url">
                <Input id="dl-url" type="url" value={f.linkUrl} onChange={(e) => setF((v) => ({ ...v, linkUrl: e.target.value }))} placeholder="https://" />
              </Field>
            </div>
            <Field label="What should they look at?" htmlFor="dl-desc">
              <Textarea id="dl-desc" rows={3} value={f.description} onChange={(e) => setF((v) => ({ ...v, description: e.target.value }))} maxLength={5000} />
            </Field>
            <Button type="submit" iconOnly={false} loading={busy} disabled={!f.title.trim()}>
              <Plus />
              <span>Create draft</span>
            </Button>
          </form>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Deliverables</CardTitle>
          {clientEmail && (
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <Checkbox checked={emailIt} onChange={() => setEmailIt((v) => !v)} aria-label="Email the link when sending" />
              Email when sending
            </label>
          )}
        </CardHeader>
        {list === null ? (
          <p className="px-5 pb-5 text-sm text-text-tertiary">Loading...</p>
        ) : list.data.length === 0 ? (
          <EmptyState variant="plain" icon={<PackageCheck className="size-5" aria-hidden />} title="No deliverables yet" description="Send work to the client for approval, one piece at a time." />
        ) : (
          <ul className="divide-y divide-card-border border-t border-card-border">
            {list.data.map((d) => (
              <li key={d.id} className="space-y-3 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">
                      {d.title} <span className="text-text-tertiary">v{d.version}</span>
                    </p>
                    {d.description && <p className="mt-0.5 whitespace-pre-wrap text-sm text-text-secondary">{d.description}</p>}
                    {d.links.map((l) => (
                      <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="mr-3 text-sm text-neutral-brand-color hover:underline">
                        {l.label}
                      </a>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color={DELIVERABLE_STATUS_COLOR[d.status] ?? "gray"}>{DELIVERABLE_STATUS_LABEL[d.status] ?? d.status}</Badge>
                    {!isArchived && d.status !== "approved" && (
                      <Button size="sm" iconOnly={false} onClick={() => send(d)}>
                        <Send />
                        <span>{d.status === "draft" ? "Send" : d.status === "in_review" ? "Resend" : "Send new version"}</span>
                      </Button>
                    )}
                    {!isArchived && d.status === "draft" && (
                      <Button size="sm" appearance="ghost" aria-label={`Delete ${d.title}`} onClick={() => remove(d)}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>

                {d.status === "approved" && (
                  <p className="text-xs text-text-tertiary">
                    Approved by {d.approvedByName}
                    {d.approvedAt ? ` on ${new Date(d.approvedAt).toLocaleDateString()}` : ""}
                  </p>
                )}
                {d.changeRequests.map((c) => (
                  <div key={c.id} className="rounded-md border border-card-border px-3 py-2 text-sm">
                    <p className="text-xs text-text-tertiary">
                      Changes requested on v{c.version} · {new Date(c.createdAt).toLocaleDateString()}
                      {c.status === "resolved" ? " · answered" : ""}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-text-primary">{c.message}</p>
                  </div>
                ))}
                {links[d.id] && (
                  <div className="flex flex-wrap items-center gap-2 rounded-md border border-card-border p-3">
                    <code className="min-w-0 flex-1 break-all text-xs text-text-primary">{links[d.id]}</code>
                    <Button type="button" size="sm" appearance="outline" iconOnly={false} onClick={() => copy(links[d.id])}>
                      <Copy />
                      <span>Copy link</span>
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
