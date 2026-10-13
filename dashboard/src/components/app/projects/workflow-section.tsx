"use client";

import { ActionButton, Empty, Loading, Notice, Panel, SelectInput, StatusBadge, TextInput } from "@/components/app/kit";
import { FormLinkCard } from "@/components/app/leads/lead-cards";
import { Button } from "@/components/tailgrids/core/button";
import { Progress } from "@/components/tailgrids/core/progress";
import { apiFetch } from "@/lib/api";
import { MILESTONE_STATUS_OPTIONS, type Milestone, type ProjectReadiness, type ProjectTemplateInfo } from "@/lib/workflow";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <StatusBadge color={ok ? "success" : "gray"}>{ok ? "Done" : "To do"}</StatusBadge>
      <span className={ok ? "text-text-primary" : "text-text-secondary"}>{label}</span>
    </li>
  );
}

/** Readiness, the project brief and the milestone workflow. */
export function WorkflowSection({ projectId, clientId, isArchived }: { projectId: string; clientId: string | null; isArchived: boolean }) {
  const [readiness, setReadiness] = useState<ProjectReadiness | null>(null);
  const [milestones, setMilestones] = useState<Milestone[] | null>(null);
  const [templates, setTemplates] = useState<ProjectTemplateInfo[]>([]);
  const [templateId, setTemplateId] = useState("website");
  const [hasEmail, setHasEmail] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [r, m] = await Promise.all([
      apiFetch<ProjectReadiness>(`/projects/${projectId}/readiness`).catch(() => null),
      apiFetch<Milestone[]>(`/projects/${projectId}/milestones`).catch(() => []),
    ]);
    setReadiness(r);
    setMilestones(m);
  }, [projectId]);

  useEffect(() => {
    load();
    apiFetch<ProjectTemplateInfo[]>("/project-templates").then(setTemplates).catch(() => setTemplates([]));
  }, [load]);

  useEffect(() => {
    if (!clientId) return;
    apiFetch<{ email: string | null }>(`/client-records/${clientId}`)
      .then((c) => setHasEmail(Boolean(c.email)))
      .catch(() => setHasEmail(false));
  }, [clientId]);

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

  const done = milestones?.filter((m) => m.status === "done").length ?? 0;
  const total = milestones?.length ?? 0;

  return (
    <>
      {readiness && (
        <Panel
          title="Project readiness"
          action={<StatusBadge color={readiness.ready ? "success" : "orange"}>{readiness.ready ? "Ready to start" : "Not ready yet"}</StatusBadge>}
        >
          {readiness.hasClient ? (
            <ul className="space-y-2">
              <Check ok={readiness.onboarding} label="Client onboarding completed" />
              <Check ok={readiness.brief} label="Project brief completed" />
              <Check ok={readiness.contract} label="Contract signed" />
            </ul>
          ) : (
            <p className="text-sm text-text-tertiary">
              This project is not linked to a client. Create projects from a client&apos;s page to track readiness.
            </p>
          )}
        </Panel>
      )}

      {clientId && !isArchived && <FormLinkCard clientId={clientId} kind="project_brief" projectId={projectId} hasEmail={hasEmail} />}

      <Panel title="Milestones" description={total > 0 ? `${done} of ${total} done` : undefined}>
        {total > 0 && (
          <div className="mb-4">
            <Progress progress={Math.round((done / total) * 100)} />
          </div>
        )}
        {milestones === null ? (
          <Loading />
        ) : milestones.length === 0 ? (
          <Empty>No milestones yet. Start from a template, or add milestones by hand.</Empty>
        ) : (
          <ul className="divide-y divide-card-border">
            {milestones.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{m.title}</p>
                  <p className="text-xs text-text-tertiary">
                    {m.doneCount}/{m.taskCount} tasks
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-40">
                    <SelectInput
                      value={m.status}
                      disabled={isArchived || busy}
                      options={MILESTONE_STATUS_OPTIONS}
                      onChange={(status) =>
                        run(() => apiFetch(`/projects/${projectId}/milestones/${m.id}`, { method: "PATCH", body: JSON.stringify({ status }) }))
                      }
                    />
                  </div>
                  {!isArchived && (
                    <Button
                      size="sm"
                      variant="danger"
                      appearance="ghost"
                      onPress={() => {
                        if (!window.confirm(`Delete "${m.title}"? Its tasks stay on the project.`)) return;
                        run(() => apiFetch(`/projects/${projectId}/milestones/${m.id}`, { method: "DELETE" }), "Milestone deleted");
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {!isArchived && (
          <div className="mt-4 space-y-4 border-t border-card-border pt-4">
            {milestones !== null && milestones.length === 0 && templates.length > 0 && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-64">
                  <SelectInput
                    label="Template"
                    value={templateId}
                    onChange={setTemplateId}
                    options={templates.map((t) => ({ value: t.id, label: t.name }))}
                  />
                </div>
                <ActionButton
                  variant="primary"
                  loading={busy}
                  onPress={() =>
                    run(
                      () => apiFetch(`/projects/${projectId}/apply-template`, { method: "POST", body: JSON.stringify({ templateId }) }),
                      "Template applied",
                    )
                  }
                >
                  Apply template
                </ActionButton>
              </div>
            )}
            <form
              className="flex items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTitle.trim()) return;
                run(async () => {
                  await apiFetch(`/projects/${projectId}/milestones`, { method: "POST", body: JSON.stringify({ title: newTitle }) });
                  setNewTitle("");
                });
              }}
            >
              <div className="flex-1">
                <TextInput label="Add a milestone" value={newTitle} onChange={setNewTitle} placeholder="e.g. Design approved" />
              </div>
              <ActionButton type="submit" appearance="outline" variant="primary" isDisabled={!newTitle.trim() || busy}>
                Add
              </ActionButton>
            </form>
            <p className="text-xs text-text-tertiary">
              Tasks for each milestone are on the{" "}
              <Link href={`?tab=tasks`} className="text-neutral-brand-color hover:underline">
                Tasks tab
              </Link>
              .
            </p>
          </div>
        )}
      </Panel>

      {readiness && !readiness.ready && readiness.hasClient && (
        <Notice status="info">Work can start once onboarding, the brief and the contract are all done.</Notice>
      )}
    </>
  );
}
