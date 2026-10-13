"use client";

import { FormLinkCard, LeadContracts, LeadProposals, SupportLinkCard } from "@/components/app/leads/lead-cards";
import { OnboardingPanel } from "@/components/app/leads/onboarding-panel";
import {
  ActionButton,
  Empty,
  ErrorNote,
  FormGrid,
  Loading,
  Modal,
  Notice,
  Page,
  PageBody,
  PageHeader,
  Panel,
  SelectInput,
  StatusBadge,
  TextAreaInput,
  TextInput,
  fmtDateTime,
} from "@/components/app/kit";
import { Button, buttonStyles } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import type { ContractSummary } from "@/lib/contracts";
import { getNextStep } from "@/lib/next-step";
import type { ProposalSummary } from "@/lib/proposals";
import {
  ACTIVITY_KIND_OPTIONS,
  type ClientActivity,
  type ClientRecord,
  isFollowUpDue,
  LEAD_SOURCES,
  LEAD_STATUS_OPTIONS,
  type LeadDiscovery,
  stageBadge,
  toDateInput,
} from "@/lib/leads";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface ClientDetail extends ClientRecord {
  projects: { id: string; name: string; status: string; archivedAt: string | null }[];
  invoices: { id: string; invoiceNumber: string; status: string; dueDate: string | null }[];
}

const blankToNull = (v: string) => (v.trim() ? v.trim() : null);

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [record, setRecord] = useState<ClientDetail | null>(null);
  const [activity, setActivity] = useState<ClientActivity[]>([]);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [f, setF] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    whatsapp: "",
    website: "",
    source: "",
    interestedIn: "",
    budget: "",
    followUp: "",
    notes: "",
  });

  const [kind, setKind] = useState("note");
  const [summary, setSummary] = useState("");
  const [logging, setLogging] = useState(false);

  const [disc, setDisc] = useState<Required<LeadDiscovery>>({ needs: "", reason: "", budget: "", timeline: "", requirements: "", notes: "" });
  const [savingDisc, setSavingDisc] = useState(false);

  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [proposals, setProposals] = useState<ProposalSummary[]>([]);
  const [creatingContract, setCreatingContract] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");

  const hydrate = useCallback((r: ClientDetail) => {
    setRecord(r);
    setDisc({
      needs: r.discovery?.needs ?? "",
      reason: r.discovery?.reason ?? "",
      budget: r.discovery?.budget ?? "",
      timeline: r.discovery?.timeline ?? "",
      requirements: r.discovery?.requirements ?? "",
      notes: r.discovery?.notes ?? "",
    });
    setF({
      name: r.name,
      company: r.company ?? "",
      email: r.email ?? "",
      phone: r.phone ?? "",
      whatsapp: r.whatsapp ?? "",
      website: r.website ?? "",
      source: r.source ?? "",
      interestedIn: r.interestedIn ?? "",
      budget: r.estimatedBudgetCents != null ? String(r.estimatedBudgetCents / 100) : "",
      followUp: toDateInput(r.nextFollowUpAt),
      notes: r.notes ?? "",
    });
  }, []);

  const loadActivity = useCallback(async () => {
    const res = await apiFetch<{ data: ClientActivity[] }>(`/client-records/${id}/activity?limit=50`);
    setActivity(res.data);
  }, [id]);

  useEffect(() => {
    apiFetch<ClientDetail>(`/client-records/${id}`)
      .then(hydrate)
      .catch((err) => setLoadError(err));
    loadActivity().catch(() => {});
  }, [id, hydrate, loadActivity]);

  async function patch(body: Record<string, unknown>, okMessage?: string): Promise<boolean> {
    try {
      await apiFetch(`/client-records/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      hydrate(await apiFetch<ClientDetail>(`/client-records/${id}`));
      await loadActivity();
      if (okMessage) toast.success(okMessage);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
      return false;
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const budget = f.budget.trim() ? Math.round(parseFloat(f.budget) * 100) : null;
    if (budget !== null && (Number.isNaN(budget) || budget < 0)) {
      setFormError("Budget must be a positive number.");
      return;
    }
    if (!f.email.trim() && !f.phone.trim() && !f.whatsapp.trim()) {
      setFormError("Keep at least one of email, phone or WhatsApp.");
      return;
    }
    setSaving(true);
    await patch(
      {
        name: f.name,
        company: blankToNull(f.company),
        email: blankToNull(f.email),
        phone: blankToNull(f.phone),
        whatsapp: blankToNull(f.whatsapp),
        website: blankToNull(f.website),
        ...(f.source !== (record?.source ?? "") ? { source: blankToNull(f.source) } : {}),
        interestedIn: blankToNull(f.interestedIn),
        estimatedBudgetCents: budget,
        nextFollowUpAt: f.followUp ? new Date(f.followUp).toISOString() : null,
        notes: blankToNull(f.notes),
      },
      "Saved",
    );
    setSaving(false);
  }

  async function saveDiscovery(e: React.FormEvent) {
    e.preventDefault();
    setSavingDisc(true);
    try {
      await apiFetch(`/client-records/${id}/discovery`, { method: "PUT", body: JSON.stringify(disc) });
      await loadActivity();
      toast.success("Discovery saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save discovery");
    } finally {
      setSavingDisc(false);
    }
  }

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) return;
    setLogging(true);
    try {
      await apiFetch(`/client-records/${id}/activity`, { method: "POST", body: JSON.stringify({ kind, summary }) });
      setSummary("");
      await loadActivity();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log activity");
    } finally {
      setLogging(false);
    }
  }

  async function markLost(e: React.FormEvent) {
    e.preventDefault();
    if (await patch({ stage: "lost", lostReason }, "Marked as lost")) {
      setLostOpen(false);
      setLostReason("");
    }
  }

  if (loadError) {
    return (
      <Page>
        <PageBody>
          <ErrorNote error={loadError} />
          <Link href="/dashboard/leads" className="text-sm text-neutral-brand-color hover:underline">
            Back to leads
          </Link>
        </PageBody>
      </Page>
    );
  }
  if (!record) return <Loading />;

  const nextStep = getNextStep({
    stage: record.stage,
    leadStatus: record.leadStatus,
    proposals,
    contracts,
    projectCount: record.projects.length,
  });

  async function runNextStep() {
    const action = nextStep?.action;
    if (!action) return;
    if (action.kind === "open_contract") {
      router.push(`/dashboard/contracts/${action.contractId}`);
      return;
    }
    setCreatingContract(true);
    try {
      const contract = await apiFetch<{ id: string }>(`/contracts/from-proposal/${action.proposalId}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      router.push(`/dashboard/contracts/${contract.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the contract");
      setCreatingContract(false);
    }
  }

  const badge = stageBadge(record);
  const isLead = record.stage === "lead";
  const due = isLead && isFollowUpDue(record.nextFollowUpAt);
  const set = (key: keyof typeof f) => (v: string) => setF((prev) => ({ ...prev, [key]: v }));
  const sourceOptions = [
    { value: "", label: "Not sure" },
    // Older records can hold a free-text source; keep it selectable so saving never rewrites it.
    ...(f.source && !LEAD_SOURCES.some((s) => s.value === f.source) ? [{ value: f.source, label: f.source }] : []),
    ...LEAD_SOURCES,
  ];

  return (
    <Page>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {record.name}
            <StatusBadge color={badge.color}>{badge.label}</StatusBadge>
            {due && <StatusBadge color="error">Follow-up due</StatusBadge>}
          </span>
        }
        description={
          <>
            <Link href="/dashboard/leads" className="text-neutral-brand-color hover:underline">
              Leads
            </Link>
            {record.company ? ` · ${record.company}` : ""}
          </>
        }
        actions={
          <>
            {isLead && (
              <>
                <div className="w-40">
                  <SelectInput
                    value={record.leadStatus ?? "new"}
                    onChange={(v) => patch({ leadStatus: v })}
                    options={LEAD_STATUS_OPTIONS}
                  />
                </div>
                <Button size="sm" variant="primary" onPress={() => patch({ stage: "active" }, "Marked as won")}>
                  Won
                </Button>
                <Button size="sm" appearance="outline" variant="primary" onPress={() => setLostOpen(true)}>
                  Lost
                </Button>
              </>
            )}
            {(record.stage === "active" || record.stage === "past") && (
              <Link href={`/dashboard/leads/${id}/create-project`} className={buttonStyles({ size: "sm" })}>
                Create project
              </Link>
            )}
            {(record.stage === "lost" || record.stage === "past") && (
              <Button size="sm" appearance="outline" variant="primary" onPress={() => patch({ stage: "lead" }, "Reopened as a lead")}>
                Reopen as lead
              </Button>
            )}
          </>
        }
      />

      <PageBody>
        {record.stage === "lost" && record.lostReason && <Notice status="warning">Lost: {record.lostReason}</Notice>}

        {nextStep && (
          <div className="space-y-3">
            <Notice status={nextStep.tone}>
              <span className="font-medium">{nextStep.title}.</span> {nextStep.text}
            </Notice>
            {nextStep.action && (
              <ActionButton size="sm" variant="primary" loading={creatingContract} onPress={runNextStep}>
                {nextStep.action.label}
              </ActionButton>
            )}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-5">
          <Panel title="Details" className="lg:col-span-3">
            <form onSubmit={handleSave} className="space-y-4">
              {formError && <Notice status="error">{formError}</Notice>}
              <FormGrid>
                <TextInput label="Name" required value={f.name} onChange={set("name")} />
                <TextInput label="Company" value={f.company} onChange={set("company")} />
                <TextInput label="Email" type="email" value={f.email} onChange={set("email")} />
                <TextInput label="Phone" value={f.phone} onChange={set("phone")} />
                <TextInput label="WhatsApp" value={f.whatsapp} onChange={set("whatsapp")} />
                <TextInput label="Website" value={f.website} onChange={set("website")} />
                <SelectInput label="Source" value={f.source} onChange={set("source")} options={sourceOptions} />
                <TextInput label="Interested in" value={f.interestedIn} onChange={set("interestedIn")} />
                <TextInput label="Estimated budget" type="number" min="0" step="0.01" value={f.budget} onChange={set("budget")} />
                <TextInput label="Follow up on" type="date" value={f.followUp} onChange={set("followUp")} />
              </FormGrid>
              <TextAreaInput label="Notes" rows={3} value={f.notes} onChange={set("notes")} />
              <ActionButton type="submit" variant="primary" loading={saving}>
                {saving ? "Saving..." : "Save changes"}
              </ActionButton>
            </form>

            {(record.projects.length > 0 || record.invoices.length > 0) && (
              <div className="mt-5 space-y-2 border-t border-card-border pt-5 text-sm">
                {record.projects.map((p) => (
                  <Link key={p.id} href={`/dashboard/projects/${p.id}`} className="block text-neutral-brand-color hover:underline">
                    Project: {p.name}
                  </Link>
                ))}
                {record.invoices.map((inv) => (
                  <p key={inv.id} className="text-text-secondary">
                    {inv.invoiceNumber} ({inv.status})
                  </p>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Activity" className="lg:col-span-2">
            <form onSubmit={handleLog} className="space-y-3">
              <div className="flex items-end gap-2">
                <div className="w-32">
                  <SelectInput value={kind} onChange={setKind} options={ACTIVITY_KIND_OPTIONS} />
                </div>
                <ActionButton type="submit" size="md" variant="primary" loading={logging} isDisabled={!summary.trim()}>
                  Log
                </ActionButton>
              </div>
              <TextAreaInput
                rows={2}
                value={summary}
                onChange={setSummary}
                placeholder="What happened? e.g. Called, wants a quote by Friday"
              />
            </form>
            {activity.length === 0 ? (
              <Empty>Nothing logged yet. Log calls, WhatsApp chats and notes here.</Empty>
            ) : (
              <ul className="mt-4 divide-y divide-card-border border-t border-card-border">
                {activity.map((a) => (
                  <li key={a.id} className="py-3">
                    <div className="flex items-center justify-between gap-2 text-xs text-text-tertiary">
                      <span className="font-medium capitalize">{a.kind === "system" ? "Update" : a.kind}</span>
                      <time dateTime={a.occurredAt}>{fmtDateTime(a.occurredAt)}</time>
                    </div>
                    <p className="mt-1 text-sm whitespace-pre-wrap text-text-primary">{a.detail}</p>
                    <p className="mt-0.5 text-xs text-text-tertiary">{a.actor.name}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {(isLead || record.discovery) && (
          <Panel title="Discovery" description="What they need and why, budget, timeline and requirements. Type it in after a call or meeting.">
            <form onSubmit={saveDiscovery} className="space-y-4">
              <FormGrid>
                <TextAreaInput label="What do they need?" rows={3} value={disc.needs} onChange={(v) => setDisc((d) => ({ ...d, needs: v }))} />
                <TextAreaInput label="Why do they need it?" rows={3} value={disc.reason} onChange={(v) => setDisc((d) => ({ ...d, reason: v }))} />
                <TextInput label="Budget" value={disc.budget} onChange={(v) => setDisc((d) => ({ ...d, budget: v }))} />
                <TextInput label="Timeline" value={disc.timeline} onChange={(v) => setDisc((d) => ({ ...d, timeline: v }))} />
              </FormGrid>
              <TextAreaInput label="Requirements" rows={4} value={disc.requirements} onChange={(v) => setDisc((d) => ({ ...d, requirements: v }))} />
              <TextAreaInput label="Other notes" rows={3} value={disc.notes} onChange={(v) => setDisc((d) => ({ ...d, notes: v }))} />
              <ActionButton type="submit" variant="primary" loading={savingDisc}>
                {savingDisc ? "Saving..." : "Save discovery"}
              </ActionButton>
            </form>
          </Panel>
        )}

        <LeadProposals
          clientId={id}
          canCreate={record.stage === "lead" || record.stage === "active"}
          onLoaded={setProposals}
          prefill={{
            title: `${record.interestedIn || "Project"} proposal for ${record.company || record.name}`,
            scope: [record.discovery?.needs, record.discovery?.requirements].filter(Boolean).join("\n\n") || undefined,
            timeline: record.discovery?.timeline,
          }}
        />

        <LeadContracts clientId={id} onLoaded={setContracts} />

        {(record.stage === "active" || record.stage === "past") && (
          <>
            <FormLinkCard clientId={id} kind="onboarding" hasEmail={Boolean(record.email)} />
            <SupportLinkCard clientId={id} />
          </>
        )}

        <OnboardingPanel
          clientId={id}
          stage={record.stage}
          hasEmail={Boolean(record.email)}
          projects={record.projects.filter((p) => !p.archivedAt).map((p) => ({ id: p.id, name: p.name }))}
        />
      </PageBody>

      <Modal
        open={lostOpen}
        onClose={() => setLostOpen(false)}
        title="Mark as lost"
        description="A short reason helps you learn what to change."
        footer={
          <>
            <Button appearance="outline" variant="primary" onPress={() => setLostOpen(false)}>
              Cancel
            </Button>
            <ActionButton variant="primary" isDisabled={!lostReason.trim()} onPress={() => markLost({ preventDefault() {} } as React.FormEvent)}>
              Mark lost
            </ActionButton>
          </>
        }
      >
        <TextInput label="Reason" required value={lostReason} onChange={setLostReason} />
      </Modal>
    </Page>
  );
}
