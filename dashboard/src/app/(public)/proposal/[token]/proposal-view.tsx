"use client";

import { PublicHeader } from "@/components/app/public";
import { ActionButton, CheckInput, fmtDate, money, Notice, Panel, StatusBadge, TextAreaInput, TextInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { PROPOSAL_STATUS_COLOR, PROPOSAL_STATUS_LABEL, type ProposalItem, totalCents } from "@/lib/proposals";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface PublicProposal {
  organizationName: string;
  primaryColor: string | null;
  logoUrl: string | null;
  clientName: string;
  title: string;
  scope: string | null;
  deliverables: string | null;
  timeline: string | null;
  paymentTerms: string | null;
  revisionLimit: number | null;
  validUntil: string | null;
  currency: string;
  status: string;
  respondedAt: string | null;
  acceptedByName: string | null;
  items: ProposalItem[];
  totalCents: number;
}

function Section({ title, text }: { title: string; text: string | null }) {
  if (!text) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      <p className="mt-1 text-sm whitespace-pre-wrap text-text-secondary">{text}</p>
    </div>
  );
}

export function ProposalView({ token, initial }: { token: string; initial: PublicProposal }) {
  const [proposal, setProposal] = useState(initial);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [declining, setDeclining] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const open = proposal.status === "sent" || proposal.status === "viewed";
  const liveItems = proposal.items.map((i) => (i.optional ? { ...i, selected: open ? picked.has(i.id) : i.selected } : i));
  const total = totalCents(liveItems);

  function toggle(id: string, on: boolean) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function answer(path: "accept" | "reject", body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/proposals/public/${encodeURIComponent(token)}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 429) throw new Error("Too many attempts. Please try again in a minute.");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(message || "Something went wrong. Please try again.");
      }
      const fresh = await fetch(`${API_URL}/api/proposals/public/${encodeURIComponent(token)}`, { cache: "no-store" });
      if (fresh.ok) setProposal((await fresh.json()) as PublicProposal);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <PublicHeader
        logoUrl={proposal.logoUrl}
        eyebrow={`Proposal from ${proposal.organizationName}`}
        title={proposal.title}
        subtitle={`Prepared for ${proposal.clientName}`}
      >
        <StatusBadge color={PROPOSAL_STATUS_COLOR[proposal.status] ?? "gray"}>{PROPOSAL_STATUS_LABEL[proposal.status] ?? proposal.status}</StatusBadge>
        {proposal.validUntil && <StatusBadge color="gray">Valid until {fmtDate(proposal.validUntil)}</StatusBadge>}
      </PublicHeader>

      {proposal.status === "accepted" && (
        <Notice status="success">
          Accepted by {proposal.acceptedByName}
          {proposal.respondedAt ? ` on ${fmtDate(proposal.respondedAt)}` : ""}. A contract will follow.
        </Notice>
      )}
      {proposal.status === "rejected" && <Notice status="warning">You declined this proposal.</Notice>}
      {proposal.status === "expired" && (
        <Notice status="warning">This proposal is no longer valid. Contact {proposal.organizationName} for an updated one.</Notice>
      )}

      <Panel>
        <div className="space-y-4">
          <Section title="Scope" text={proposal.scope} />
          <Section title="Deliverables" text={proposal.deliverables} />
          <Section title="Timeline" text={proposal.timeline} />
          <Section title="Payment terms" text={proposal.paymentTerms} />
          {proposal.revisionLimit !== null && <Section title="Revisions included" text={String(proposal.revisionLimit)} />}
        </div>
      </Panel>

      <Panel title="Pricing">
        <ul className="divide-y divide-card-border">
          {liveItems.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 py-3">
              <div className="flex items-start gap-3">
                {item.optional && open && (
                  <CheckInput checked={picked.has(item.id)} onChange={(on) => toggle(item.id, on)} label={<span className="sr-only">Include {item.description}</span>} />
                )}
                <div>
                  <p className="text-sm font-medium text-text-primary">{item.description}</p>
                  <p className="text-xs text-text-tertiary">
                    {item.quantity > 1 ? `${item.quantity} × ${money(item.unitPriceCents, proposal.currency)}` : null}
                    {item.optional ? `${item.quantity > 1 ? " · " : ""}Optional` : null}
                    {item.optional && !open && !item.selected ? " · Not included" : null}
                  </p>
                </div>
              </div>
              <span className={`font-numeric text-sm tabular-nums ${item.optional && !item.selected ? "text-text-tertiary line-through" : "text-text-primary"}`}>
                {money(item.quantity * item.unitPriceCents, proposal.currency)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-card-border pt-3">
          <span className="text-sm font-medium text-text-primary">Total</span>
          <span className="font-numeric text-xl font-semibold text-text-primary tabular-nums">
            {money(open ? total : proposal.totalCents, proposal.currency)}
          </span>
        </div>
      </Panel>

      {open && (
        <Panel>
          <div className="space-y-4">
            {error && <Notice status="error">{error}</Notice>}
            {!declining ? (
              <>
                <TextInput label="Type your full name to accept" required value={name} onChange={setName} autoComplete="name" />
                <p className="text-xs text-text-tertiary">By accepting you agree to the scope and price above. A contract will follow for signing.</p>
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    variant="primary"
                    loading={busy}
                    isDisabled={!name.trim()}
                    onPress={() => answer("accept", { name, optionalItemIds: [...picked] })}
                  >
                    Accept proposal
                  </ActionButton>
                  <Button appearance="outline" variant="primary" onPress={() => setDeclining(true)}>
                    Decline
                  </Button>
                </div>
              </>
            ) : (
              <>
                <TextAreaInput label="Reason (optional)" rows={3} value={reason} onChange={setReason} />
                <div className="flex flex-wrap gap-2">
                  <ActionButton variant="primary" loading={busy} onPress={() => answer("reject", { reason: reason.trim() || undefined })}>
                    Decline proposal
                  </ActionButton>
                  <Button appearance="outline" variant="primary" onPress={() => setDeclining(false)}>
                    Back
                  </Button>
                </div>
              </>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
