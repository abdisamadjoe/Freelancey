"use client";

import { ActionButton, CheckInput, Notice, Panel, StatusBadge, TextInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import type { CompletionCheck, HandoverData, HandoverItemRow } from "@/lib/workflow";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

/** Complete the project, then hand everything over to the client. */
export function HandoverSection({
  projectId,
  clientEmail,
  isArchived,
  onProjectChange,
}: {
  projectId: string;
  clientEmail: boolean;
  isArchived: boolean;
  onProjectChange: () => void;
}) {
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
      if (okMessage) toast.success(okMessage);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const patchItem = (item: HandoverItemRow, body: Record<string, unknown>) =>
    run(() => apiFetch(`/projects/${projectId}/handover/items/${item.id}`, { method: "PATCH", body: JSON.stringify(body) }));

  if (!check || handover === undefined) return null;

  const openItems = handover?.items.filter((i) => !i.done).length ?? 0;

  return (
    <>
      <Panel
        title="Finish the project"
        action={<StatusBadge color={check.completed ? "success" : "gray"}>{check.completed ? "Completed" : "In progress"}</StatusBadge>}
      >
        <div className="space-y-4">
          {check.completed ? (
            <Notice status="success">Project completed. {handover ? "The handover is below." : "Next step: start the handover."}</Notice>
          ) : (
            <>
              {check.blockers.length === 0 ? (
                <Notice status="success">Everything is done. Tasks, milestones and deliverables are finished and approved.</Notice>
              ) : (
                <Notice status="warning">
                  Open work remains:{" "}
                  {check.blockers.map((b) => `${b.count} ${b.label}`).join(", ")}
                </Notice>
              )}
              {!isArchived && (
                <div className="space-y-3">
                  {check.blockers.length > 0 && (
                    <TextInput
                      label="Complete anyway? Say why"
                      value={reason}
                      onChange={setReason}
                      placeholder="e.g. Client approved by phone"
                    />
                  )}
                  <ActionButton
                    variant="primary"
                    loading={busy}
                    isDisabled={check.blockers.length > 0 && !reason.trim()}
                    onPress={() =>
                      run(async () => {
                        await apiFetch(`/projects/${projectId}/complete`, {
                          method: "POST",
                          body: JSON.stringify({ overrideReason: reason.trim() || undefined }),
                        });
                        setReason("");
                        onProjectChange();
                      }, "Project completed")
                    }
                  >
                    Mark project complete
                  </ActionButton>
                </div>
              )}
            </>
          )}
        </div>
      </Panel>

      {check.completed && !handover && !isArchived && (
        <Panel title="Handover" description="Hand over logins, files and instructions to the client in one place.">
          <ActionButton
            variant="primary"
            loading={busy}
            onPress={() => run(() => apiFetch(`/projects/${projectId}/handover`, { method: "POST" }), "Handover started")}
          >
            Start handover
          </ActionButton>
        </Panel>
      )}

      {handover && (
        <Panel
          title="Handover"
          action={
            <StatusBadge color={handover.status === "completed" ? "success" : "blue"}>
              {handover.status === "completed" ? "Complete" : "In progress"}
            </StatusBadge>
          }
        >
          <ul className="divide-y divide-card-border">
            {handover.items.map((item) => (
              <li key={item.id} className="space-y-2 py-3 first:pt-0">
                <div className="flex items-center justify-between gap-3">
                  <CheckInput
                    checked={item.done}
                    disabled={isArchived || busy || handover.status === "completed"}
                    onChange={(done) => patchItem(item, { done })}
                    label={<span className={item.done ? "text-text-tertiary line-through" : "font-medium"}>{item.title}</span>}
                  />
                  {!isArchived && handover.status !== "completed" && (
                    <Button
                      size="sm"
                      variant="danger"
                      appearance="ghost"
                      onPress={() => {
                        if (!window.confirm(`Remove "${item.title}"?`)) return;
                        run(() => apiFetch(`/projects/${projectId}/handover/items/${item.id}`, { method: "DELETE" }));
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                {handover.status !== "completed" && !isArchived ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <textarea
                      rows={2}
                      defaultValue={item.details ?? ""}
                      maxLength={3000}
                      placeholder="Details"
                      aria-label={`Details for ${item.title}`}
                      className="w-full rounded-lg border border-card-border bg-input-background px-3 py-2 text-sm text-title-50 outline-none focus:border-input-primary-focus-border"
                      onBlur={(e) => e.target.value !== (item.details ?? "") && patchItem(item, { details: e.target.value.trim() || null })}
                    />
                    <input
                      type="url"
                      defaultValue={item.linkUrl ?? ""}
                      placeholder="Link (https://)"
                      aria-label={`Link for ${item.title}`}
                      className="h-10 w-full rounded-lg border border-card-border bg-input-background px-3 text-sm text-title-50 outline-none focus:border-input-primary-focus-border"
                      onBlur={(e) => e.target.value !== (item.linkUrl ?? "") && patchItem(item, { linkUrl: e.target.value.trim() || null })}
                    />
                  </div>
                ) : (
                  <div className="pl-6 text-sm text-text-secondary">
                    {item.details && <p className="whitespace-pre-wrap">{item.details}</p>}
                    {item.linkUrl && (
                      <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-brand-color hover:underline">
                        {item.linkUrl}
                      </a>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {handover.status !== "completed" && !isArchived && (
            <div className="mt-4 space-y-4 border-t border-card-border pt-4">
              <Notice status="info">
                The client sees these details on their handover page. Never paste passwords here; share them through a password manager.
              </Notice>
              <form
                className="flex items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTitle.trim()) return;
                  run(async () => {
                    await apiFetch(`/projects/${projectId}/handover/items`, { method: "POST", body: JSON.stringify({ title: newTitle }) });
                    setNewTitle("");
                  });
                }}
              >
                <div className="flex-1">
                  <TextInput label="Add an item" value={newTitle} onChange={setNewTitle} placeholder="e.g. Hosting login" />
                </div>
                <ActionButton type="submit" appearance="outline" variant="primary" isDisabled={!newTitle.trim() || busy}>
                  Add
                </ActionButton>
              </form>

              <div className="flex flex-wrap items-center gap-3">
                <ActionButton
                  appearance="outline"
                  variant="primary"
                  loading={busy}
                  onPress={() =>
                    run(async () => {
                      const res = await apiFetch<{ link: string; emailed: boolean }>(`/projects/${projectId}/handover/share`, {
                        method: "POST",
                        body: JSON.stringify({ email: emailIt && clientEmail }),
                      });
                      setLink(res.link);
                    }, "Handover link ready")
                  }
                >
                  Share with client
                </ActionButton>
                {clientEmail && <CheckInput checked={emailIt} onChange={setEmailIt} label="Email it to the client" />}
                <ActionButton
                  variant="primary"
                  loading={busy}
                  isDisabled={openItems > 0}
                  onPress={() => run(() => apiFetch(`/projects/${projectId}/handover/complete`, { method: "POST" }), "Handover complete")}
                >
                  Complete handover
                </ActionButton>
                {openItems > 0 && (
                  <span className="text-xs text-text-tertiary">
                    {openItems} {openItems === 1 ? "item" : "items"} to go
                  </span>
                )}
              </div>
              {link && (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-card-border p-3">
                  <code className="min-w-0 flex-1 text-xs break-all text-text-primary">{link}</code>
                  <Button
                    size="sm"
                    appearance="outline"
                    variant="primary"
                    onPress={async () => {
                      try {
                        await navigator.clipboard.writeText(link);
                        toast.success("Link copied");
                      } catch {
                        toast.error("Copy failed. Select the link and copy it by hand.");
                      }
                    }}
                  >
                    Copy link
                  </Button>
                </div>
              )}
            </div>
          )}
        </Panel>
      )}
    </>
  );
}
