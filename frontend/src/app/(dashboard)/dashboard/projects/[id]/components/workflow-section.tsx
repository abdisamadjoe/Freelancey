"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { FormLinkCard } from "@/components/form-link-card";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  NativeSelect,
  Progress,
} from "@/components/ui";
import {
  MILESTONE_STATUS_OPTIONS,
  type Milestone,
  type ProjectReadiness,
  type ProjectTemplateInfo,
} from "@/lib/workflow";

interface Props {
  projectId: string;
  clientId: string | null;
  isArchived: boolean;
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  const Icon = ok ? CheckCircle2 : Circle;
  return (
    <li className="flex items-center gap-2 text-sm">
      <Icon className={ok ? "size-4 text-alert-success-title" : "size-4 text-text-tertiary"} aria-hidden />
      <span className={ok ? "text-text-primary" : "text-text-secondary"}>{label}</span>
    </li>
  );
}

/** Readiness, the project brief and the milestone workflow. Staff only. */
export function WorkflowSection({ projectId, clientId, isArchived }: Props) {
  const { success, error: showError } = useToast();
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
      if (okMessage) success(okMessage);
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const applyTemplate = () =>
    run(
      () => apiFetch(`/projects/${projectId}/apply-template`, { method: "POST", body: JSON.stringify({ templateId }) }),
      "Template applied",
    );

  const addMilestone = () =>
    run(async () => {
      await apiFetch(`/projects/${projectId}/milestones`, { method: "POST", body: JSON.stringify({ title: newTitle }) });
      setNewTitle("");
    });

  const setStatus = (m: Milestone, status: string) =>
    run(() => apiFetch(`/projects/${projectId}/milestones/${m.id}`, { method: "PATCH", body: JSON.stringify({ status }) }));

  const removeMilestone = (m: Milestone) => {
    if (!window.confirm(`Delete "${m.title}"? Its tasks stay on the project.`)) return;
    return run(() => apiFetch(`/projects/${projectId}/milestones/${m.id}`, { method: "DELETE" }), "Milestone deleted");
  };

  const done = milestones?.filter((m) => m.status === "done").length ?? 0;
  const total = milestones?.length ?? 0;

  return (
    <div className="space-y-5">
      {readiness && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Project readiness</CardTitle>
            <Badge color={readiness.ready ? "success" : "orange"}>{readiness.ready ? "Ready to start" : "Not ready yet"}</Badge>
          </CardHeader>
          {readiness.hasClient ? (
            <ul className="space-y-2 p-5 pt-0">
              <Check ok={readiness.onboarding} label="Client onboarding completed" />
              <Check ok={readiness.brief} label="Project brief completed" />
              <Check ok={readiness.contract} label="Contract signed" />
            </ul>
          ) : (
            <p className="p-5 pt-0 text-sm text-text-secondary">
              This project is not linked to a client. Create projects from a client's page to track readiness.
            </p>
          )}
        </Card>
      )}

      {clientId && !isArchived && <FormLinkCard clientId={clientId} kind="project_brief" projectId={projectId} hasEmail={hasEmail} />}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Milestones</CardTitle>
          {total > 0 && (
            <span className="text-sm text-text-tertiary">
              {done} of {total} done
            </span>
          )}
        </CardHeader>
        {total > 0 && (
          <div className="px-5 pb-3">
            <Progress value={Math.round((done / total) * 100)} />
          </div>
        )}

        {milestones === null ? (
          <p className="px-5 pb-5 text-sm text-text-tertiary">Loading...</p>
        ) : milestones.length === 0 ? (
          <EmptyState variant="plain" title="No milestones yet" description="Start from a template, or add milestones by hand." />
        ) : (
          <ul className="divide-y divide-card-border border-t border-card-border">
            {milestones.map((m) => (
              <li key={m.id} className="space-y-1 px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className={m.status === "done" ? "text-sm font-medium text-text-tertiary line-through" : "text-sm font-medium text-text-primary"}>
                      {m.title}
                    </p>
                    {m.description && <p className="text-xs text-text-tertiary">{m.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-tertiary">
                      {m.doneCount}/{m.taskCount} tasks
                    </span>
                    <NativeSelect
                      value={m.status}
                      onChange={(e) => setStatus(m, e.target.value)}
                      disabled={isArchived || busy}
                      aria-label={`Status of ${m.title}`}
                      className="h-8 w-36 py-0 text-xs"
                    >
                      {MILESTONE_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </NativeSelect>
                    {!isArchived && (
                      <Button type="button" size="sm" appearance="ghost" aria-label={`Delete ${m.title}`} onClick={() => removeMilestone(m)}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!isArchived && (
          <div className="space-y-4 border-t border-card-border p-5">
            {milestones !== null && milestones.length === 0 && templates.length > 0 && (
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Template" htmlFor="tpl">
                  <NativeSelect id="tpl" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="h-10 w-64 py-0">
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Button loading={busy} onClick={applyTemplate}>
                  Apply template
                </Button>
              </div>
            )}
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (newTitle.trim()) addMilestone();
              }}
            >
              <Field label="Add a milestone" htmlFor="ms-title">
                <Input id="ms-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={200} className="w-64" />
              </Field>
              <Button type="submit" appearance="outline" iconOnly={false} disabled={!newTitle.trim() || busy}>
                <Plus />
                <span>Add</span>
              </Button>
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
      </Card>
      {readiness && !readiness.ready && readiness.hasClient && (
        <Alert status="info">Work can start once onboarding, the brief and the contract are all done.</Alert>
      )}
    </div>
  );
}
