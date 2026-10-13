"use client";

import {
  ActionButton,
  CheckInput,
  ErrorNote,
  fmtDate,
  FormGrid,
  Loading,
  money,
  Notice,
  Page,
  PageBody,
  PageHeader,
  Panel,
  StatusBadge,
  TextAreaInput,
  TextInput,
} from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { PROPOSAL_STATUS_COLOR, PROPOSAL_STATUS_LABEL, type ProposalDetail, totalCents } from "@/lib/proposals";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Row {
  key: string;
  description: string;
  quantity: string;
  price: string;
  optional: boolean;
}

let rowCounter = 0;
const newRow = (): Row => ({ key: `r${rowCounter++}`, description: "", quantity: "1", price: "", optional: false });
const blankToNull = (v: string) => (v.trim() ? v.trim() : null);

export default function ProposalPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [creatingContract, setCreatingContract] = useState(false);
  const [emailIt, setEmailIt] = useState(true);
  const [link, setLink] = useState("");
  const [f, setF] = useState({ title: "", scope: "", deliverables: "", timeline: "", paymentTerms: "", revisionLimit: "", validUntil: "", currency: "USD" });
  const [rows, setRows] = useState<Row[]>([newRow()]);

  const hydrate = useCallback((p: ProposalDetail) => {
    setProposal(p);
    setF({
      title: p.title,
      scope: p.scope ?? "",
      deliverables: p.deliverables ?? "",
      timeline: p.timeline ?? "",
      paymentTerms: p.paymentTerms ?? "",
      revisionLimit: p.revisionLimit != null ? String(p.revisionLimit) : "",
      validUntil: p.validUntil ? p.validUntil.slice(0, 10) : "",
      currency: p.currency,
    });
    setRows(
      p.items.length
        ? p.items.map((i) => ({
            key: `r${rowCounter++}`,
            description: i.description,
            quantity: String(i.quantity),
            price: String(i.unitPriceCents / 100),
            optional: i.optional,
          }))
        : [newRow()],
    );
  }, []);

  useEffect(() => {
    apiFetch<ProposalDetail>(`/proposals/${id}`)
      .then(hydrate)
      .catch(setLoadError);
  }, [id, hydrate]);

  const locked = proposal?.status === "accepted";

  function parsedItems() {
    const out: { description: string; quantity: number; unitPriceCents: number; optional: boolean }[] = [];
    for (const r of rows) {
      if (!r.description.trim() && !r.price.trim()) continue;
      const quantity = parseInt(r.quantity, 10);
      const price = Math.round(parseFloat(r.price) * 100);
      if (!r.description.trim()) return "Every line item needs a description.";
      if (!Number.isInteger(quantity) || quantity < 1) return "Quantity must be 1 or more.";
      if (Number.isNaN(price) || price < 0) return "Price must be a number, 0 or more.";
      out.push({ description: r.description.trim(), quantity, unitPriceCents: price, optional: r.optional });
    }
    return out;
  }

  async function save(): Promise<boolean> {
    const items = parsedItems();
    if (typeof items === "string") {
      toast.error(items);
      return false;
    }
    const revision = f.revisionLimit.trim() ? parseInt(f.revisionLimit, 10) : null;
    if (revision !== null && (Number.isNaN(revision) || revision < 0)) {
      toast.error("Revisions must be 0 or more.");
      return false;
    }
    setSaving(true);
    try {
      const updated = await apiFetch<ProposalDetail>(`/proposals/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: f.title,
          scope: blankToNull(f.scope),
          deliverables: blankToNull(f.deliverables),
          timeline: blankToNull(f.timeline),
          paymentTerms: blankToNull(f.paymentTerms),
          revisionLimit: revision,
          validUntil: f.validUntil ? new Date(f.validUntil).toISOString() : null,
          currency: f.currency,
          items,
        }),
      });
      hydrate(updated);
      setLink("");
      toast.success("Saved");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function send() {
    if (!(await save())) return;
    setSending(true);
    try {
      const res = await apiFetch<{ link: string; emailed: boolean }>(`/proposals/${id}/send`, {
        method: "POST",
        body: JSON.stringify({ email: emailIt && Boolean(proposal?.client.email) }),
      });
      setLink(res.link);
      hydrate(await apiFetch<ProposalDetail>(`/proposals/${id}`));
      toast.success(res.emailed ? "Proposal emailed" : "Proposal ready to share");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  async function createContract() {
    setCreatingContract(true);
    try {
      const contract = await apiFetch<{ id: string }>(`/contracts/from-proposal/${id}`, { method: "POST", body: JSON.stringify({}) });
      router.push(`/dashboard/contracts/${contract.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the contract");
      setCreatingContract(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this draft?")) return;
    try {
      await apiFetch(`/proposals/${id}`, { method: "DELETE" });
      router.push(`/dashboard/leads/${proposal?.clientId ?? ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
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
  if (!proposal) return <Loading />;

  const setField = (key: keyof typeof f) => (v: string) => setF((prev) => ({ ...prev, [key]: v }));
  const setRow = (key: string, patch: Partial<Row>) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const preview = rows.map((r) => ({
    quantity: parseInt(r.quantity, 10) || 0,
    unitPriceCents: Math.round((parseFloat(r.price) || 0) * 100),
    optional: r.optional,
    selected: !r.optional,
  }));
  const required = totalCents(preview);
  const withOptional = totalCents(preview.map((p) => ({ ...p, selected: true })));
  const sentState = proposal.status !== "draft";

  return (
    <Page>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {proposal.title}
            <StatusBadge color={PROPOSAL_STATUS_COLOR[proposal.status] ?? "gray"}>{PROPOSAL_STATUS_LABEL[proposal.status] ?? proposal.status}</StatusBadge>
          </span>
        }
        description={
          <>
            <Link href={`/dashboard/leads/${proposal.clientId}`} className="text-neutral-brand-color hover:underline">
              {proposal.client.name}
            </Link>{" "}
            · For {proposal.client.company || proposal.client.name}
          </>
        }
        actions={
          proposal.status === "draft" && (
            <Button size="sm" appearance="outline" variant="primary" onPress={remove}>
              Delete draft
            </Button>
          )
        }
      />

      <PageBody>
        {proposal.status === "accepted" && (
          <div className="space-y-3">
            <Notice status="success">
              Proposal accepted by {proposal.acceptedByName}
              {proposal.respondedAt ? ` on ${fmtDate(proposal.respondedAt)}` : ""}. Next step: create the contract.
            </Notice>
            <ActionButton size="sm" variant="primary" loading={creatingContract} onPress={createContract}>
              Create contract
            </ActionButton>
          </div>
        )}
        {proposal.status === "rejected" && (
          <Notice status="warning">
            Proposal declined. {proposal.rejectionReason || "No reason given."} Revise and resend it, or mark the lead as lost.
          </Notice>
        )}
        {proposal.status === "expired" && (
          <Notice status="warning">Proposal expired. Extend the valid-until date and resend it, or mark the lead as lost.</Notice>
        )}
        {sentState && !locked && <Notice status="info">Editing a sent proposal turns it back into a draft and the old link stops working.</Notice>}

        <Panel title="Details">
          <div className="space-y-4">
            <FormGrid>
              <TextInput label="Title" required value={f.title} onChange={setField("title")} disabled={locked} />
              <TextInput label="Valid until" type="date" value={f.validUntil} onChange={setField("validUntil")} disabled={locked} />
              <TextInput label="Timeline" value={f.timeline} onChange={setField("timeline")} disabled={locked} placeholder="e.g. 6 weeks from kickoff" />
              <TextInput label="Revisions included" type="number" min={0} max={100} value={f.revisionLimit} onChange={setField("revisionLimit")} disabled={locked} />
            </FormGrid>
            <TextAreaInput label="Scope" rows={4} value={f.scope} onChange={setField("scope")} disabled={locked} />
            <TextAreaInput label="Deliverables" rows={3} value={f.deliverables} onChange={setField("deliverables")} disabled={locked} />
            <TextAreaInput label="Payment terms" rows={2} value={f.paymentTerms} onChange={setField("paymentTerms")} disabled={locked} placeholder="e.g. 50% upfront, 50% on launch" />
          </div>
        </Panel>

        <Panel title="Pricing">
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.key} className="grid items-end gap-2 sm:grid-cols-[1fr_5rem_8rem_auto_auto]">
                <TextInput label="Item" value={r.description} onChange={(v) => setRow(r.key, { description: v })} disabled={locked} />
                <TextInput label="Qty" type="number" min={1} value={r.quantity} onChange={(v) => setRow(r.key, { quantity: v })} disabled={locked} />
                <TextInput label={`Price (${f.currency})`} type="number" min={0} step="0.01" value={r.price} onChange={(v) => setRow(r.key, { price: v })} disabled={locked} />
                <div className="flex h-10 items-center">
                  <CheckInput checked={r.optional} onChange={(v) => setRow(r.key, { optional: v })} disabled={locked} label="Optional" />
                </div>
                {!locked && (
                  <Button
                    size="sm"
                    appearance="outline"
                    variant="primary"
                    onPress={() => setRows((prev) => (prev.length > 1 ? prev.filter((x) => x.key !== r.key) : [newRow()]))}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            {!locked && (
              <Button size="sm" appearance="outline" variant="primary" onPress={() => setRows((prev) => [...prev, newRow()])}>
                Add item
              </Button>
            )}
            <div className="border-t border-card-border pt-3 text-right">
              <p className="font-numeric text-lg font-semibold text-text-primary tabular-nums">{money(required, f.currency)}</p>
              {withOptional !== required && (
                <p className="text-xs text-text-tertiary">{money(withOptional, f.currency)} with optional items</p>
              )}
            </div>
          </div>
        </Panel>

        {!locked && (
          <Panel>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <ActionButton appearance="outline" variant="primary" loading={saving} onPress={() => save()}>
                  Save
                </ActionButton>
                <ActionButton variant="primary" loading={sending} onPress={send}>
                  {proposal.status === "draft" ? "Save & send" : "Resend"}
                </ActionButton>
                {proposal.client.email ? (
                  <CheckInput checked={emailIt} onChange={setEmailIt} label={`Email it to ${proposal.client.email}`} />
                ) : (
                  <span className="text-sm text-text-tertiary">No email on file. You will get a link to share.</span>
                )}
              </div>
              {link && (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-card-border p-3">
                  <code className="min-w-0 flex-1 text-xs break-all text-text-primary">{link}</code>
                  <Button size="sm" appearance="outline" variant="primary" onPress={() => navigator.clipboard.writeText(link).then(() => toast.success("Link copied"))}>
                    Copy link
                  </Button>
                </div>
              )}
            </div>
          </Panel>
        )}
      </PageBody>
    </Page>
  );
}
