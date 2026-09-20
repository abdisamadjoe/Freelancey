"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle, ClipboardList, Mail, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, CardDescription, CardHeader, CardTitle, Checkbox, Input, NativeSelect, Progress } from "@/components/ui";
import type { StaffOnboarding } from "@/lib/onboarding";

interface Linkables {
  documents: { id: string; title: string; status: string }[];
  invoices: { id: string; invoiceNumber: string; status: string }[];
}

interface Props {
  clientId: string;
  stage: string;
  hasEmail: boolean;
  projects: { id: string; name: string }[];
}

/** Checklist, portal invitation and questionnaire for one client. Staff only. */
export function OnboardingPanel({ clientId, stage, hasEmail, projects }: Props) {
  const { success, error: showError } = useToast();
  const [data, setData] = useState<StaffOnboarding | null>(null);
  const [linkables, setLinkables] = useState<Linkables | null>(null);
  const [projectId, setProjectId] = useState("");
  const [sendInvite, setSendInvite] = useState(hasEmail);
  const [busy, setBusy] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [showAnswers, setShowAnswers] = useState(false);
  const [noteProject, setNoteProject] = useState("");

  const base = `/client-records/${clientId}/onboarding`;

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<StaffOnboarding>(base));
    } catch {
      setData(null);
    }
  }, [base]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (data?.started) {
      apiFetch<Linkables>(`${base}/linkables`).then(setLinkables).catch(() => setLinkables(null));
    }
  }, [data?.started, base, projects.length]);

  async function run(action: () => Promise<unknown>, okMessage?: string) {
    setBusy(true);
    try {
      await action();
      if (okMessage) success(okMessage);
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Something went wrong");
      await load(); // undo any optimistic change
    } finally {
      setBusy(false);
    }
  }

  /** Shows a manual step as ticked straight away; the save that follows confirms or, on failure, `run` reloads the truth. */
  function tickLocally(itemId: string, done: boolean) {
    setData((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((i) => (i.id === itemId ? { ...i, done } : i));
      const doneCount = items.filter((i) => i.done).length;
      return { ...prev, items, progress: { done: doneCount, total: items.length, complete: items.length > 0 && doneCount === items.length } };
    });
  }

  const post = (path: string, body: unknown = {}) =>
    apiFetch<{ status?: string; email?: string }>(`${base}${path}`, { method: "POST", body: JSON.stringify(body) });

  async function start() {
    await run(async () => {
      await post("/start", { projectId: projectId || undefined });
      if (sendInvite) {
        const res = await post("/invite", { projectId: projectId || undefined });
        success(res.status === "linked" ? "Linked to their existing login" : `Invitation sent to ${res.email}`);
      }
    }, sendInvite ? undefined : "Onboarding started");
  }

  if (!data) return null;
  if (!data.started && stage === "lead") return null;

  if (!data.started) {
    return (
      <Card className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <ClipboardList className="size-5 text-text-tertiary" aria-hidden />
          <h2 className="text-sm font-semibold text-text-primary">Client onboarding</h2>
        </div>
        <p className="text-sm text-text-tertiary">
          Give your client a short checklist in their portal: sign the agreement, pay the deposit, fill in the questionnaire and upload their
          files.
        </p>
        {projects.length > 0 && (
          <NativeSelect value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label="Project" className="h-9 sm:w-72">
            <option value="">No project yet</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        )}
        <Checkbox
          id="onb-invite"
          checked={sendInvite && hasEmail}
          disabled={!hasEmail}
          onChange={(e) => setSendInvite(e.target.checked)}
          label={hasEmail ? "Email them a portal invitation" : "Add an email to invite them to the portal"}
        />
        <Button size="sm" loading={busy} onClick={start} iconOnly={false}>
          Start onboarding
        </Button>
      </Card>
    );
  }

  const { items, progress, contacts, intake } = data;
  const joined = contacts.some((c) => c.userId);

  return (
    <Card className="p-0">
      <CardHeader className="px-5 py-4">
        <div className="min-w-0">
          <CardTitle>Client onboarding</CardTitle>
          <CardDescription>
            {progress.done} of {progress.total} steps done{progress.complete ? " - all set" : ""}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge color={joined ? "success" : "warning"}>{joined ? "In the portal" : "Not in the portal yet"}</Badge>
          {hasEmail && (
            <Button
              type="button"
              size="xs"
              appearance="outline"
              iconOnly={false}
              loading={busy}
              onClick={() =>
                run(async () => {
                  const res = await post("/invite", { projectId: projectId || undefined });
                  success(res.status === "linked" ? "Linked to their existing login" : `Invitation sent to ${res.email}`);
                })
              }
            >
              <Mail />
              <span>{joined ? "Re-invite" : "Send invite"}</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <div className="px-5 pb-3">
        <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
      </div>

      <ul className="divide-y divide-card-border border-t border-card-border">
        {items.map((item) => {
          const canLink = (item.kind === "sign_agreement" || item.kind === "pay_deposit") && (!item.linkedType || item.linkedLabel !== null);
          const options =
            item.kind === "sign_agreement"
              ? (linkables?.documents ?? []).map((d) => ({ value: `document:${d.id}`, label: `${d.title} (${d.status})` }))
              : (linkables?.invoices ?? []).map((i) => ({ value: `invoice:${i.id}`, label: `${i.invoiceNumber} (${i.status})` }));
          const current = item.linkedType && item.linkedId ? `${item.linkedType}:${item.linkedId}` : "";
          const manual = !item.linkedType && item.kind !== "sign_agreement" && item.kind !== "pay_deposit";

          return (
            <li key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              {manual ? (
                <div className="min-w-0 flex-1">
                  <Checkbox
                    id={`onb-${item.id}`}
                    checked={item.done}
                    onChange={(e) => {
                      const done = e.target.checked;
                      tickLocally(item.id, done);
                      run(() => apiFetch(`${base}/items/${item.id}`, { method: "PATCH", body: JSON.stringify({ done }) }));
                    }}
                    label={<span className={item.done ? "line-through text-text-tertiary" : ""}>{item.title}</span>}
                  />
                </div>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {item.done ? (
                    <CheckCircle2 className="size-5 shrink-0 text-alert-success-title" aria-label="Done" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-text-tertiary" aria-label="Not done" />
                  )}
                  <span className={`text-sm ${item.done ? "text-text-tertiary line-through" : "text-text-primary"}`}>{item.title}</span>
                  {item.kind === "intake" && intake && (
                    <Badge color={intake.status === "submitted" ? "success" : "gray"}>
                      {intake.status === "submitted" ? "Submitted" : "Not submitted"}
                    </Badge>
                  )}
                </div>
              )}

              {canLink && (
                <NativeSelect
                  value={current}
                  aria-label={`Link ${item.title}`}
                  className="h-8 w-56 py-0 text-xs"
                  onChange={(e) => {
                    const [type, id] = e.target.value.split(":");
                    run(() =>
                      apiFetch(`${base}/items/${item.id}`, {
                        method: "PATCH",
                        body: JSON.stringify(e.target.value ? { linkedType: type, linkedId: id } : { linkedType: null, linkedId: null }),
                      }),
                    );
                  }}
                >
                  <option value="">{options.length ? "Link to..." : "Nothing to link yet"}</option>
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </NativeSelect>
              )}

              {item.kind !== "intake" && (
                <button
                  type="button"
                  aria-label={`Remove ${item.title}`}
                  className="text-text-tertiary hover:text-alert-danger-title"
                  onClick={() => run(() => apiFetch(`${base}/items/${item.id}`, { method: "DELETE" }))}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <form
        className="flex gap-2 border-t border-card-border px-5 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newItem.trim()) return;
          run(async () => {
            await post("/items", { title: newItem });
            setNewItem("");
          });
        }}
      >
        <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add a step, e.g. Send brand guidelines" maxLength={200} aria-label="New step" />
        <Button type="submit" size="sm" appearance="outline" disabled={!newItem.trim()} loading={busy}>
          Add
        </Button>
      </form>

      {intake && intake.status === "submitted" && (
        <div className="space-y-3 border-t border-card-border px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-text-primary">Questionnaire answers</p>
            <div className="flex flex-wrap items-center gap-2">
              {projects.length > 0 && (
                <>
                  <NativeSelect value={noteProject} onChange={(e) => setNoteProject(e.target.value)} aria-label="Project for notes" className="h-8 w-44 py-0 text-xs">
                    <option value="">Copy to project notes...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </NativeSelect>
                  <Button
                    type="button"
                    size="xs"
                    appearance="outline"
                    iconOnly={false}
                    disabled={!noteProject}
                    loading={busy}
                    onClick={() => run(() => post("/intake-to-note", { projectId: noteProject }), "Copied into the project's internal notes")}
                  >
                    Copy
                  </Button>
                </>
              )}
              <Button type="button" size="xs" appearance="outline" iconOnly={false} onClick={() => setShowAnswers((v) => !v)}>
                {showAnswers ? "Hide" : "View"}
              </Button>
            </div>
          </div>
          {showAnswers && (
            <dl className="space-y-3">
              {intake.fields
                .filter((f) => intake.answers[f.key])
                .map((f) => (
                  <div key={f.key}>
                    <dt className="text-xs text-text-tertiary">{f.label}</dt>
                    <dd className="whitespace-pre-wrap text-sm text-text-primary">{intake.answers[f.key]}</dd>
                  </div>
                ))}
            </dl>
          )}
        </div>
      )}
    </Card>
  );
}
