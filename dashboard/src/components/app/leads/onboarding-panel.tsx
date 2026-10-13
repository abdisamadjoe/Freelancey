"use client";

import { ActionButton, CheckInput, Panel, SelectInput, StatusBadge, TextInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { Progress } from "@/components/tailgrids/core/progress";
import { apiFetch } from "@/lib/api";
import type { StaffOnboarding } from "@/lib/onboarding";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Linkables {
  documents: { id: string; title: string; status: string }[];
  invoices: { id: string; invoiceNumber: string; status: string }[];
}

/** Checklist, portal invitation and questionnaire for one client. */
export function OnboardingPanel({
  clientId,
  stage,
  hasEmail,
  projects,
}: {
  clientId: string;
  stage: string;
  hasEmail: boolean;
  projects: { id: string; name: string }[];
}) {
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
      if (okMessage) toast.success(okMessage);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
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
    await run(
      async () => {
        await post("/start", { projectId: projectId || undefined });
        if (sendInvite) {
          const res = await post("/invite", { projectId: projectId || undefined });
          toast.success(res.status === "linked" ? "Linked to their existing login" : `Invitation sent to ${res.email}`);
        }
      },
      sendInvite ? undefined : "Onboarding started",
    );
  }

  if (!data) return null;
  if (!data.started && stage === "lead") return null;

  const projectOptions = [{ value: "", label: "No project yet" }, ...projects.map((p) => ({ value: p.id, label: p.name }))];

  if (!data.started) {
    return (
      <Panel title="Client onboarding">
        <div className="space-y-3">
          <p className="text-sm text-text-tertiary">
            Give your client a short checklist in their portal: sign the agreement, pay the deposit, fill in the questionnaire and upload
            their files.
          </p>
          {projects.length > 0 && (
            <div className="sm:w-72">
              <SelectInput value={projectId} onChange={setProjectId} options={projectOptions} />
            </div>
          )}
          <CheckInput
            checked={sendInvite && hasEmail}
            disabled={!hasEmail}
            onChange={setSendInvite}
            label={hasEmail ? "Email them a portal invitation" : "Add an email to invite them to the portal"}
          />
          <ActionButton size="sm" variant="primary" loading={busy} onPress={start}>
            Start onboarding
          </ActionButton>
        </div>
      </Panel>
    );
  }

  const { items, progress, contacts, intake } = data;
  const joined = contacts.some((c) => c.userId);

  return (
    <Panel
      flush
      title="Client onboarding"
      description={`${progress.done} of ${progress.total} steps done${progress.complete ? " - all set" : ""}`}
      action={
        <>
          <StatusBadge color={joined ? "success" : "warning"}>{joined ? "In the portal" : "Not in the portal yet"}</StatusBadge>
          {hasEmail && (
            <ActionButton
              size="xs"
              appearance="outline"
              variant="primary"
              loading={busy}
              onPress={() =>
                run(async () => {
                  const res = await post("/invite", { projectId: projectId || undefined });
                  toast.success(res.status === "linked" ? "Linked to their existing login" : `Invitation sent to ${res.email}`);
                })
              }
            >
              {joined ? "Re-invite" : "Send invite"}
            </ActionButton>
          )}
        </>
      }
    >
      <div className="px-5 pb-3">
        <Progress progress={progress.total ? (progress.done / progress.total) * 100 : 0} />
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
                  <CheckInput
                    checked={item.done}
                    onChange={(done) => {
                      tickLocally(item.id, done);
                      run(() => apiFetch(`${base}/items/${item.id}`, { method: "PATCH", body: JSON.stringify({ done }) }));
                    }}
                    label={<span className={item.done ? "text-text-tertiary line-through" : ""}>{item.title}</span>}
                  />
                </div>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <StatusBadge color={item.done ? "success" : "gray"}>{item.done ? "Done" : "To do"}</StatusBadge>
                  <span className={`text-sm ${item.done ? "text-text-tertiary line-through" : "text-text-primary"}`}>{item.title}</span>
                  {item.kind === "intake" && intake && (
                    <StatusBadge color={intake.status === "submitted" ? "success" : "gray"}>
                      {intake.status === "submitted" ? "Submitted" : "Not submitted"}
                    </StatusBadge>
                  )}
                </div>
              )}

              {canLink && (
                <div className="w-56">
                  <SelectInput
                    value={current}
                    placeholder={options.length ? "Link to..." : "Nothing to link yet"}
                    options={[{ value: "", label: options.length ? "Link to..." : "Nothing to link yet" }, ...options]}
                    onChange={(v) => {
                      const [type, id] = v.split(":");
                      run(() =>
                        apiFetch(`${base}/items/${item.id}`, {
                          method: "PATCH",
                          body: JSON.stringify(v ? { linkedType: type, linkedId: id } : { linkedType: null, linkedId: null }),
                        }),
                      );
                    }}
                  />
                </div>
              )}

              {item.kind !== "intake" && (
                <button
                  type="button"
                  aria-label={`Remove ${item.title}`}
                  className="text-sm text-text-tertiary hover:text-alert-danger-title"
                  onClick={() => run(() => apiFetch(`${base}/items/${item.id}`, { method: "DELETE" }))}
                >
                  Remove
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <form
        className="flex items-end gap-2 border-t border-card-border px-5 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newItem.trim()) return;
          run(async () => {
            await post("/items", { title: newItem });
            setNewItem("");
          });
        }}
      >
        <div className="flex-1">
          <TextInput value={newItem} onChange={setNewItem} placeholder="Add a step, e.g. Send brand guidelines" />
        </div>
        <ActionButton type="submit" size="md" appearance="outline" variant="primary" isDisabled={!newItem.trim()} loading={busy}>
          Add
        </ActionButton>
      </form>

      {intake && intake.status === "submitted" && (
        <div className="space-y-3 border-t border-card-border px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-text-primary">Questionnaire answers</p>
            <div className="flex flex-wrap items-center gap-2">
              {projects.length > 0 && (
                <>
                  <div className="w-52">
                    <SelectInput
                      value={noteProject}
                      onChange={setNoteProject}
                      placeholder="Copy to project notes..."
                      options={[{ value: "", label: "Copy to project notes..." }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
                    />
                  </div>
                  <ActionButton
                    size="xs"
                    appearance="outline"
                    variant="primary"
                    isDisabled={!noteProject}
                    loading={busy}
                    onPress={() => run(() => post("/intake-to-note", { projectId: noteProject }), "Copied into the project's internal notes")}
                  >
                    Copy
                  </ActionButton>
                </>
              )}
              <Button size="xs" appearance="outline" variant="primary" onPress={() => setShowAnswers((v) => !v)}>
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
                    <dd className="text-sm whitespace-pre-wrap text-text-primary">{intake.answers[f.key]}</dd>
                  </div>
                ))}
            </dl>
          )}
        </div>
      )}
    </Panel>
  );
}
