"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle, Copy, Flag, Plus, Share2, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Alert, Badge, Button, Card, CardHeader, CardTitle, Checkbox, Field, Input, Textarea } from "@/components/ui";
import type { CompletionCheck, HandoverData, HandoverItemRow } from "@/lib/workflow";

interface Props {
  projectId: string;
  clientEmail: boolean;
  isArchived: boolean;
  onProjectChange: () => void;
}

/** Complete the project, then hand everything over to the client. Staff only. */
export function HandoverSection({ projectId, clientEmail, isArchived, onProjectChange }: Props) {
  const { success, error: showError } = useToast();
  const [check, setCheck] = useState<CompletionCheck | null>(null);
  const [handover, setHandover] = useState<HandoverData | null | undefined>(undefined);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailIt, setEmailIt] = useState(clientEmail);
  const [link, setLink] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const load = useCallback(async () => {
    const [c, h] = await Promise.all([
      apiFetch<CompletionCheck>(`/projects/${projectId}/completion-check`).catch(() => null),
      apiFetch<HandoverData | null>(`/projects/${projectId}/handover`).catch(() => null),
    ]);
    setCheck(c);
    setHandover(h);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action: () => Promise<unknown>, okMessage?: string) {
    setBusy(true);
    try {
      await action();
      if (okMessage) success(okMessage);
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const completeProject = () =>
    run(async () => {
      await apiFetch(`/projects/${projectId}/complete`, { method: "POST", body: JSON.stringify({ overrideReason: reason.trim() || undefined }) });
      setReason("");
      onProjectChange();
    }, "Project completed");

  const startHandover = () => run(() => apiFetch(`/projects/${projectId}/handover`, { method: "POST" }), "Handover started");

  const patchItem = (item: HandoverItemRow, body: Record<string, unknown>) =>
    run(() => apiFetch(`/projects/${projectId}/handover/items/${item.id}`, { method: "PATCH", body: JSON.stringify(body) }));

  const removeItem = (item: HandoverItemRow) => {
    if (!window.confirm(`Remove "${item.title}"?`)) return;
    return run(() => apiFetch(`/projects/${projectId}/handover/items/${item.id}`, { method: "DELETE" }));
  };

  const addItem = () =>
    run(async () => {
      await apiFetch(`/projects/${projectId}/handover/items`, { method: "POST", body: JSON.stringify({ title: newTitle }) });
      setNewTitle("");
    });

  const share = () =>
    run(async () => {
      const res = await apiFetch<{ link: string; emailed: boolean }>(`/projects/${projectId}/handover/share`, {
        method: "POST",
        body: JSON.stringify({ email: emailIt && clientEmail }),
      });
      setLink(res.link);
    }, "Handover link ready");

  const completeHandover = () => run(() => apiFetch(`/projects/${projectId}/handover/complete`, { method: "POST" }), "Handover complete");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      success("Link copied");
    } catch {
      showError("Copy failed. Select the link and copy it by hand.");
    }
  }

  if (check === null || handover === undefined) return <p className="py-6 text-sm text-text-tertiary">Loading...</p>;

  const openItems = handover?.items.filter((i) => !i.done).length ?? 0;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Finish the project</CardTitle>
          <Badge color={check.completed ? "success" : "gray"}>{check.completed ? "Completed" : "In progress"}</Badge>
        </CardHeader>
        <div className="space-y-4 p-5 pt-0">
          {check.completed ? (
            <Alert status="success" title="Project completed">
              {handover ? "The handover is below." : "Next step: start the handover."}
            </Alert>
          ) : (
            <>
              {check.blockers.length === 0 ? (
                <Alert status="success" title="Everything is done">
                  Tasks, milestones and deliverables are finished and approved.
                </Alert>
              ) : (
                <Alert status="warning" title="Open work remains">
                  <ul className="list-disc pl-4">
                    {check.blockers.map((b) => (
                      <li key={b.kind}>{b.label}</li>
                    ))}
                  </ul>
                </Alert>
              )}
              {!isArchived && (
                <div className="space-y-3">
                  {check.blockers.length > 0 && (
                    <Field label="Complete anyway? Say why" htmlFor="override">
                      <Input id="override" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="e.g. Client approved by phone" />
                    </Field>
                  )}
                  <Button iconOnly={false} loading={busy} disabled={check.blockers.length > 0 && !reason.trim()} onClick={completeProject}>
                    <Flag />
                    <span>Mark project completed</span>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {check.completed && !handover && !isArchived && (
        <Card className="space-y-3 p-5">
          <p className="text-sm text-text-secondary">Hand over the files, documentation, access, training and deployment details.</p>
          <Button loading={busy} onClick={startHandover}>
            Start handover
          </Button>
        </Card>
      )}

      {handover && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Handover</CardTitle>
            <Badge color={handover.status === "completed" ? "success" : "blue"}>{handover.status === "completed" ? "Complete" : "In progress"}</Badge>
          </CardHeader>
          <ul className="divide-y divide-card-border border-t border-card-border">
            {handover.items.map((item) => {
              const Icon = item.done ? CheckCircle2 : Circle;
              return (
                <li key={item.id} className="space-y-2 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      disabled={isArchived || busy || handover.status === "completed"}
                      onClick={() => patchItem(item, { done: !item.done })}
                      className="flex min-w-0 items-start gap-2 text-left"
                      aria-label={`${item.done ? "Mark not done" : "Mark done"}: ${item.title}`}
                    >
                      <Icon className={item.done ? "mt-0.5 size-4 text-alert-success-title" : "mt-0.5 size-4 text-text-tertiary"} aria-hidden />
                      <span className={item.done ? "text-sm font-medium text-text-tertiary line-through" : "text-sm font-medium text-text-primary"}>{item.title}</span>
                    </button>
                    {!isArchived && handover.status !== "completed" && (
                      <Button type="button" size="sm" appearance="ghost" aria-label={`Remove ${item.title}`} onClick={() => removeItem(item)}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                  {handover.status !== "completed" && !isArchived ? (
                    <div className="grid gap-2 pl-6 sm:grid-cols-2">
                      <Textarea
                        rows={2}
                        defaultValue={item.details ?? ""}
                        maxLength={3000}
                        aria-label={`Details for ${item.title}`}
                        onBlur={(e) => e.target.value !== (item.details ?? "") && patchItem(item, { details: e.target.value.trim() || null })}
                      />
                      <Input
                        type="url"
                        defaultValue={item.linkUrl ?? ""}
                        placeholder="Link (https://)"
                        aria-label={`Link for ${item.title}`}
                        onBlur={(e) => e.target.value !== (item.linkUrl ?? "") && patchItem(item, { linkUrl: e.target.value.trim() || null })}
                      />
                    </div>
                  ) : (
                    <div className="pl-6 text-sm text-text-secondary">
                      {item.details && <p className="whitespace-pre-wrap">{item.details}</p>}
                      {item.linkUrl && (
                        <a href={item.linkUrl} target="_blank" rel="noreferrer noopener" className="text-neutral-brand-color hover:underline">
                          {item.linkUrl}
                        </a>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {handover.status !== "completed" && !isArchived && (
            <div className="space-y-4 border-t border-card-border p-5">
              <Alert status="info">The client sees these details on their handover page. Never paste passwords here; share them through a password manager.</Alert>
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newTitle.trim()) addItem();
                }}
              >
                <Field label="Add an item" htmlFor="ho-new">
                  <Input id="ho-new" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={200} className="w-64" />
                </Field>
                <Button type="submit" appearance="outline" iconOnly={false} disabled={!newTitle.trim() || busy}>
                  <Plus />
                  <span>Add</span>
                </Button>
              </form>
              <div className="flex flex-wrap items-center gap-3">
                <Button appearance="outline" iconOnly={false} loading={busy} onClick={share}>
                  <Share2 />
                  <span>{handover.shared ? "Create a new client link" : "Share with the client"}</span>
                </Button>
                {clientEmail && (
                  <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <Checkbox checked={emailIt} onChange={() => setEmailIt((v) => !v)} aria-label="Email the link" />
                    Email it to the client
                  </label>
                )}
                <Button iconOnly={false} loading={busy} disabled={openItems > 0} onClick={completeHandover}>
                  <CheckCircle2 />
                  <span>Handover complete</span>
                </Button>
                {openItems > 0 && (
                  <span className="text-sm text-text-tertiary">
                    {openItems} {openItems === 1 ? "item" : "items"} to go
                  </span>
                )}
              </div>
              {link && (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-card-border p-3">
                  <code className="min-w-0 flex-1 break-all text-xs text-text-primary">{link}</code>
                  <Button type="button" size="sm" appearance="outline" iconOnly={false} onClick={copyLink}>
                    <Copy />
                    <span>Copy link</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
