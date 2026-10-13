"use client";

import { ActionButton, Empty, ListRow, ListRows, money, Notice, Panel, StatusBadge, fmtDate } from "@/components/app/kit";
import { Badge } from "@/components/tailgrids/core/badge";
import { Button } from "@/components/tailgrids/core/button";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import { apiFetch } from "@/lib/api";
import { CONTRACT_STATUS_COLOR, CONTRACT_STATUS_LABEL, type ContractSummary } from "@/lib/contracts";
import type { FormAnswers, FormKind, FormLinkSummary } from "@/lib/form-links";
import { PROPOSAL_STATUS_COLOR, PROPOSAL_STATUS_LABEL, type ProposalSummary } from "@/lib/proposals";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

/** Contracts written for one lead or client. Hidden until there is one. */
export function LeadContracts({ clientId, onLoaded }: { clientId: string; onLoaded?: (rows: ContractSummary[]) => void }) {
  const [rows, setRows] = useState<ContractSummary[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<ContractSummary[]>(`/client-records/${clientId}/contracts`);
      setRows(data);
      onLoaded?.(data);
    } catch {
      setRows([]);
    }
  }, [clientId, onLoaded]);

  useEffect(() => {
    load();
  }, [load]);

  if (rows.length === 0) return null;

  return (
    <Panel title="Contracts" flush>
      <ListRows className="border-t border-card-border">
        {rows.map((c) => (
          <ListRow key={c.id} href={`/dashboard/contracts/${c.id}`}>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">{c.title}</p>
              <p className="text-xs text-text-tertiary">
                {c.signedAt
                  ? `Signed ${fmtDate(c.signedAt)} by ${c.signedByName}`
                  : c.sentAt
                    ? `Sent ${fmtDate(c.sentAt)}`
                    : `Created ${fmtDate(c.createdAt)}`}
              </p>
            </div>
            <Badge color={CONTRACT_STATUS_COLOR[c.status] ?? "gray"}>{CONTRACT_STATUS_LABEL[c.status] ?? c.status}</Badge>
          </ListRow>
        ))}
      </ListRows>
    </Panel>
  );
}

/** Proposals for one lead or client, plus the "Create proposal" action. */
export function LeadProposals({
  clientId,
  prefill,
  canCreate,
  onLoaded,
}: {
  clientId: string;
  /** Pre-fills a new proposal so nothing from the lead is typed twice. */
  prefill: { title: string; scope?: string; timeline?: string };
  canCreate: boolean;
  onLoaded?: (rows: ProposalSummary[]) => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<ProposalSummary[] | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: ProposalSummary[] }>(`/proposals?clientId=${clientId}&limit=50`);
      setRows(res.data);
      onLoaded?.(res.data);
    } catch {
      setRows([]);
    }
  }, [clientId, onLoaded]);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    setCreating(true);
    try {
      const created = await apiFetch<{ id: string }>("/proposals", {
        method: "POST",
        body: JSON.stringify({ clientId, title: prefill.title, scope: prefill.scope, timeline: prefill.timeline, items: [] }),
      });
      router.push(`/dashboard/proposals/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the proposal");
      setCreating(false);
    }
  }

  return (
    <Panel
      title="Proposals"
      flush
      action={
        canCreate && (
          <ActionButton size="sm" variant="primary" loading={creating} onPress={create}>
            Create proposal
          </ActionButton>
        )
      }
    >
      {rows === null ? (
        <p className="px-5 pb-5 text-sm text-text-tertiary">Loading...</p>
      ) : rows.length === 0 ? (
        <Empty>No proposals yet. Once the lead is qualified, create a proposal. Their details and discovery notes carry over.</Empty>
      ) : (
        <ListRows className="border-t border-card-border">
          {rows.map((p) => (
            <ListRow key={p.id} href={`/dashboard/proposals/${p.id}`}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary">{p.title}</p>
                <p className="text-xs text-text-tertiary">
                  {p.sentAt ? `Sent ${fmtDate(p.sentAt)}` : `Created ${fmtDate(p.createdAt)}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-secondary">{money(p.totalCents, p.currency)}</span>
                <Badge color={PROPOSAL_STATUS_COLOR[p.status] ?? "gray"}>{PROPOSAL_STATUS_LABEL[p.status] ?? p.status}</Badge>
              </div>
            </ListRow>
          ))}
        </ListRows>
      )}
    </Panel>
  );
}

/** Gives the client a private link where they can ask for help. A new link replaces the old one. */
export function SupportLinkCard({ clientId }: { clientId: string }) {
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (link && !window.confirm("This replaces the current support link. The old link will stop working.")) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ link: string }>(`/client-records/${clientId}/support-link`, { method: "POST" });
      setLink(res.link);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the link");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed. Select the link and copy it by hand.");
    }
  }

  return (
    <Panel title="Support">
      <div className="space-y-3">
        <p className="text-sm text-text-secondary">
          Share a private link so this client can report problems after launch. Requests land in your Support inbox.
        </p>
        <ActionButton size="sm" appearance="outline" variant="primary" loading={busy} onPress={create}>
          {link ? "Create a new link" : "Create support link"}
        </ActionButton>
        {link && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-card-border p-3">
            <code className="min-w-0 flex-1 text-xs break-all text-text-primary">{link}</code>
            <Button size="sm" appearance="outline" variant="primary" onPress={copy}>
              Copy link
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
}

const FORM_COPY = {
  onboarding: {
    title: "Client onboarding",
    incomplete: "Client onboarding incomplete",
    pending: "Waiting for the client to fill in the form.",
    send: "Send client onboarding form",
    done: "Onboarding completed",
    help: "Tell me about your business: audience, goals, branding and requirements.",
  },
  project_brief: {
    title: "Project brief",
    incomplete: "Project requirements haven't been completed",
    pending: "Waiting for the client to fill in the brief.",
    send: "Send project brief",
    done: "Project brief completed",
    help: "Tell me about this project: goals, pages, features, integrations and success criteria.",
  },
} as const;

/** Sends a secure form link to the client and shows whether they have filled it in. */
export function FormLinkCard({
  clientId,
  kind,
  projectId,
  hasEmail,
}: {
  clientId: string;
  kind: FormKind;
  /** Required for a project brief. */
  projectId?: string;
  hasEmail: boolean;
}) {
  const copy = FORM_COPY[kind];
  const [link, setLink] = useState<FormLinkSummary | null | undefined>(undefined);
  const [url, setUrl] = useState("");
  const [emailIt, setEmailIt] = useState(hasEmail);
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<FormAnswers | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ clientId, kind });
      if (projectId) params.set("projectId", projectId);
      const rows = await apiFetch<FormLinkSummary[]>(`/form-links?${params}`);
      setLink(rows[0] ?? null);
    } catch {
      setLink(null);
    }
  }, [clientId, kind, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    setBusy(true);
    try {
      const res = await apiFetch<{ link: string; emailed: boolean }>("/form-links", {
        method: "POST",
        body: JSON.stringify({ clientId, kind, projectId, email: emailIt && hasEmail }),
      });
      setUrl(res.link);
      await load();
      toast.success(res.emailed ? "Form emailed" : "Form link ready to share");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the link");
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed. Select the link and copy it by hand.");
    }
  }

  async function viewAnswers() {
    if (!link) return;
    try {
      setAnswers(await apiFetch<FormAnswers>(`/form-links/${link.id}/answers`));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load the answers");
    }
  }

  if (link === undefined) return null;
  const completed = link?.status === "completed";

  return (
    <Panel
      title={copy.title}
      action={
        completed ? (
          <StatusBadge color="success">Completed</StatusBadge>
        ) : link ? (
          <StatusBadge color={link.status === "expired" ? "orange" : "blue"}>{link.status === "expired" ? "Link expired" : "Pending"}</StatusBadge>
        ) : (
          <StatusBadge color="gray">Not sent</StatusBadge>
        )
      }
    >
      <div className="space-y-4">
        {completed ? (
          <>
            <Notice status="success">
              {copy.done}
              {link?.completedAt ? `. Submitted ${fmtDate(link.completedAt)}.` : ""}
            </Notice>
            <Button size="sm" appearance="outline" variant="primary" onPress={viewAnswers}>
              View answers
            </Button>
            {answers && (
              <dl className="divide-y divide-card-border rounded-md border border-card-border">
                {answers.fields
                  .filter((f) => answers.answers[f.key])
                  .map((f) => (
                    <div key={f.key} className="px-4 py-3">
                      <dt className="text-xs font-medium text-text-tertiary">{f.label}</dt>
                      <dd className="mt-1 text-sm break-words whitespace-pre-wrap text-text-primary">{answers.answers[f.key]}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </>
        ) : (
          <>
            <Notice status="warning">
              {copy.incomplete}. {link && link.status === "pending" ? copy.pending : copy.help}
            </Notice>
            <div className="flex flex-wrap items-center gap-3">
              <ActionButton size="sm" variant="primary" loading={busy} onPress={send}>
                {link ? "Send a new link" : copy.send}
              </ActionButton>
              {hasEmail ? (
                <Checkbox isSelected={emailIt} onChange={setEmailIt}>
                  <span className="text-sm text-text-secondary">Email it to the client</span>
                </Checkbox>
              ) : (
                <span className="text-sm text-text-tertiary">No email on file. You will get a link to share.</span>
              )}
            </div>
            {url && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-card-border p-3">
                <code className="min-w-0 flex-1 text-xs break-all text-text-primary">{url}</code>
                <Button size="sm" appearance="outline" variant="primary" onPress={copyUrl}>
                  Copy link
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}
