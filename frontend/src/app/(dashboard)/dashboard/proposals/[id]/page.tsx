"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, FileSignature, Plus, Send, Trash2 } from "lucide-react";
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
  Field,
  Input,
  PageHeader,
  Textarea,
} from "@/components/ui";
import {
  PROPOSAL_STATUS_COLOR,
  PROPOSAL_STATUS_LABEL,
  type ProposalDetail,
  formatMoney,
  totalCents,
} from "@/lib/proposals";

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
  const { success, error: showError } = useToast();
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [creatingContract, setCreatingContract] = useState(false);
  const [emailIt, setEmailIt] = useState(true);
  const [link, setLink] = useState("");
  const [f, setF] = useState({
    title: "", scope: "", deliverables: "", timeline: "", paymentTerms: "",
    revisionLimit: "", validUntil: "", currency: "USD",
  });
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
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load"));
  }, [id, hydrate]);

  const locked = proposal?.status === "accepted";

  function parsedItems(): { description: string; quantity: number; unitPriceCents: number; optional: boolean }[] | string {
    const out = [];
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
      showError(items);
      return false;
    }
    const revision = f.revisionLimit.trim() ? parseInt(f.revisionLimit, 10) : null;
    if (revision !== null && (Number.isNaN(revision) || revision < 0)) {
      showError("Revisions must be 0 or more.");
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
      success("Saved");
      return true;
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not save");
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
      success(res.emailed ? "Proposal emailed" : "Proposal ready to share");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      success("Link copied");
    } catch {
      showError("Copy failed. Select the link and copy it by hand.");
    }
  }

  async function createContract() {
    setCreatingContract(true);
    try {
      const contract = await apiFetch<{ id: string }>(`/contracts/from-proposal/${id}`, { method: "POST", body: JSON.stringify({}) });
      router.push(`/dashboard/contracts/${contract.id}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not create the contract");
      setCreatingContract(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this draft?")) return;
    try {
      await apiFetch(`/proposals/${id}`, { method: "DELETE" });
      router.push(`/dashboard/leads/${proposal?.clientId ?? ""}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not delete");
    }
  }

  if (loadError) {
    return (
      <div className="space-y-5">
        <Alert status="error">{loadError}</Alert>
        <Link href="/dashboard/leads" className="text-sm text-neutral-brand-color hover:underline">
          Back to leads
        </Link>
      </div>
    );
  }
  if (!proposal) return <p className="py-10 text-center text-sm text-text-tertiary">Loading...</p>;

  const set = (key: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((prev) => ({ ...prev, [key]: e.target.value }));
  const setRow = (key: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

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
    <div className="space-y-5">
      <Link
        href={`/dashboard/leads/${proposal.clientId}`}
        className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {proposal.client.name}
      </Link>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {proposal.title}
            <Badge color={PROPOSAL_STATUS_COLOR[proposal.status] ?? "gray"}>
              {PROPOSAL_STATUS_LABEL[proposal.status] ?? proposal.status}
            </Badge>
          </span>
        }
        description={`For ${proposal.client.company || proposal.client.name}`}
        actions={
          proposal.status === "draft" ? (
            <Button size="sm" appearance="outline" iconOnly={false} onClick={remove}>
              <Trash2 />
              <span>Delete draft</span>
            </Button>
          ) : undefined
        }
      />

      {proposal.status === "accepted" && (
        <Alert status="success" title="Proposal accepted">
          Accepted by {proposal.acceptedByName}
          {proposal.respondedAt ? ` on ${new Date(proposal.respondedAt).toLocaleDateString()}` : ""}. Next step: create the contract.
          <div className="mt-3">
            <Button size="sm" iconOnly={false} loading={creatingContract} onClick={createContract}>
              <FileSignature />
              <span>Create contract</span>
            </Button>
          </div>
        </Alert>
      )}
      {proposal.status === "rejected" && (
        <Alert status="warning" title="Proposal declined">
          {proposal.rejectionReason || "No reason given."} Revise and resend it, or mark the lead as lost.
        </Alert>
      )}
      {proposal.status === "expired" && (
        <Alert status="warning" title="Proposal expired">Extend the valid-until date and resend it, or mark the lead as lost.</Alert>
      )}
      {sentState && !locked && (
        <Alert status="info">Editing a sent proposal turns it back into a draft and the old link stops working.</Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <div className="space-y-4 p-5 pt-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="p-title" required>
              <Input id="p-title" value={f.title} onChange={set("title")} maxLength={200} disabled={locked} />
            </Field>
            <Field label="Valid until" htmlFor="p-valid">
              <Input id="p-valid" type="date" value={f.validUntil} onChange={set("validUntil")} disabled={locked} />
            </Field>
            <Field label="Timeline" htmlFor="p-timeline">
              <Input id="p-timeline" value={f.timeline} onChange={set("timeline")} maxLength={1000} disabled={locked} placeholder="e.g. 6 weeks from kickoff" />
            </Field>
            <Field label="Revisions included" htmlFor="p-rev">
              <Input id="p-rev" type="number" min="0" max="100" value={f.revisionLimit} onChange={set("revisionLimit")} disabled={locked} />
            </Field>
          </div>
          <Field label="Scope" htmlFor="p-scope">
            <Textarea id="p-scope" rows={4} value={f.scope} onChange={set("scope")} maxLength={10000} disabled={locked} />
          </Field>
          <Field label="Deliverables" htmlFor="p-deliv">
            <Textarea id="p-deliv" rows={3} value={f.deliverables} onChange={set("deliverables")} maxLength={5000} disabled={locked} />
          </Field>
          <Field label="Payment terms" htmlFor="p-pay">
            <Textarea id="p-pay" rows={2} value={f.paymentTerms} onChange={set("paymentTerms")} maxLength={3000} disabled={locked} placeholder="e.g. 50% upfront, 50% on launch" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <div className="space-y-3 p-5 pt-0">
          {rows.map((r) => (
            <div key={r.key} className="grid items-end gap-2 sm:grid-cols-[1fr_5rem_8rem_auto_auto]">
              <Field label="Item" htmlFor={`d-${r.key}`}>
                <Input id={`d-${r.key}`} value={r.description} onChange={(e) => setRow(r.key, { description: e.target.value })} maxLength={300} disabled={locked} />
              </Field>
              <Field label="Qty" htmlFor={`q-${r.key}`}>
                <Input id={`q-${r.key}`} type="number" min="1" value={r.quantity} onChange={(e) => setRow(r.key, { quantity: e.target.value })} disabled={locked} />
              </Field>
              <Field label={`Price (${f.currency})`} htmlFor={`p-${r.key}`}>
                <Input id={`p-${r.key}`} type="number" min="0" step="0.01" value={r.price} onChange={(e) => setRow(r.key, { price: e.target.value })} disabled={locked} />
              </Field>
              <label className="flex h-10 items-center gap-2 text-sm text-text-secondary">
                <Checkbox checked={r.optional} onChange={() => setRow(r.key, { optional: !r.optional })} disabled={locked} aria-label="Optional item" />
                Optional
              </label>
              {!locked && (
                <Button
                  type="button"
                  appearance="outline"
                  size="sm"
                  aria-label="Remove item"
                  onClick={() => setRows((prev) => (prev.length > 1 ? prev.filter((x) => x.key !== r.key) : [newRow()]))}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          ))}
          {!locked && (
            <Button type="button" appearance="outline" size="sm" iconOnly={false} onClick={() => setRows((prev) => [...prev, newRow()])}>
              <Plus />
              <span>Add item</span>
            </Button>
          )}
          <div className="border-t border-card-border pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Total (required items)</span>
              <span className="text-lg font-semibold text-text-primary">{formatMoney(required, f.currency)}</span>
            </div>
            {withOptional !== required && (
              <div className="mt-1 flex justify-between text-text-tertiary">
                <span>If the client adds every optional item</span>
                <span>{formatMoney(withOptional, f.currency)}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {!locked && (
        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button appearance="outline" loading={saving} onClick={save}>
              Save changes
            </Button>
            <Button iconOnly={false} loading={sending} onClick={send}>
              <Send />
              <span>{sentState ? "Save and resend" : "Send proposal"}</span>
            </Button>
            {proposal.client.email ? (
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <Checkbox checked={emailIt} onChange={() => setEmailIt((v) => !v)} aria-label="Email the link" />
                Email it to {proposal.client.email}
              </label>
            ) : (
              <span className="text-sm text-text-tertiary">No email on file. You will get a link to share.</span>
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
        </Card>
      )}
    </div>
  );
}
