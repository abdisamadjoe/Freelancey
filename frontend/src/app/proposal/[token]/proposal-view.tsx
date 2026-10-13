"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle2, XCircle } from "lucide-react";
import { Alert, Badge, Button, Card, Checkbox, Field, Input, Textarea } from "@/components/ui";
import { PROPOSAL_STATUS_COLOR, PROPOSAL_STATUS_LABEL, formatMoney, totalCents, type ProposalItem } from "@/lib/proposals";

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
      <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">{text}</p>
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

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
      <div className="text-center">
        {proposal.logoUrl && (
          <Image src={proposal.logoUrl} alt="" width={56} height={56} unoptimized className="mx-auto mb-3 size-14 rounded-lg object-contain" />
        )}
        <p className="text-sm text-text-tertiary">Proposal from {proposal.organizationName}</p>
        <h1 className="mt-1 text-2xl font-semibold text-text-primary">{proposal.title}</h1>
        <p className="mt-1 text-sm text-text-tertiary">Prepared for {proposal.clientName}</p>
        <div className="mt-2 flex justify-center gap-2">
          <Badge color={PROPOSAL_STATUS_COLOR[proposal.status] ?? "gray"}>
            {PROPOSAL_STATUS_LABEL[proposal.status] ?? proposal.status}
          </Badge>
          {proposal.validUntil && (
            <Badge color="gray">Valid until {new Date(proposal.validUntil).toLocaleDateString()}</Badge>
          )}
        </div>
      </div>

      {proposal.status === "accepted" && (
        <Alert status="success" title="Accepted">
          Accepted by {proposal.acceptedByName}
          {proposal.respondedAt ? ` on ${new Date(proposal.respondedAt).toLocaleDateString()}` : ""}. A contract will follow.
        </Alert>
      )}
      {proposal.status === "rejected" && <Alert status="warning" title="Declined">You declined this proposal.</Alert>}
      {proposal.status === "expired" && (
        <Alert status="warning" title="Expired">This proposal is no longer valid. Contact {proposal.organizationName} for an updated one.</Alert>
      )}

      <Card className="space-y-5 p-6">
        <Section title="Scope" text={proposal.scope} />
        <Section title="Deliverables" text={proposal.deliverables} />
        <Section title="Timeline" text={proposal.timeline} />
        <Section title="Payment terms" text={proposal.paymentTerms} />
        {proposal.revisionLimit !== null && (
          <Section title="Revisions included" text={String(proposal.revisionLimit)} />
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-semibold text-text-primary">Pricing</h2>
        <ul className="mt-3 divide-y divide-card-border">
          {liveItems.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 py-3 text-sm">
              <div className="flex items-start gap-3">
                {item.optional && open && (
                  <Checkbox
                    checked={picked.has(item.id)}
                    onChange={() => toggle(item.id)}
                    aria-label={`Include ${item.description}`}
                  />
                )}
                <div>
                  <p className="text-text-primary">{item.description}</p>
                  <p className="text-xs text-text-tertiary">
                    {item.quantity > 1 ? `${item.quantity} × ${formatMoney(item.unitPriceCents, proposal.currency)}` : null}
                    {item.optional ? `${item.quantity > 1 ? " · " : ""}Optional` : null}
                    {item.optional && !open && !item.selected ? " · Not included" : null}
                  </p>
                </div>
              </div>
              <span className={item.optional && !item.selected ? "text-text-tertiary line-through" : "text-text-primary"}>
                {formatMoney(item.quantity * item.unitPriceCents, proposal.currency)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-card-border pt-3">
          <span className="text-sm font-medium text-text-primary">Total</span>
          <span className="text-lg font-semibold text-text-primary">
            {formatMoney(open ? total : proposal.totalCents, proposal.currency)}
          </span>
        </div>
      </Card>

      {open && (
        <Card className="space-y-4 p-6">
          {error && <Alert status="error">{error}</Alert>}
          {!declining ? (
            <>
              <Field label="Type your full name to accept" htmlFor="accept-name" required>
                <Input id="accept-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} autoComplete="name" />
              </Field>
              <p className="text-xs text-text-tertiary">
                By accepting you agree to the scope and price above. A contract will follow for signing.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  iconOnly={false}
                  loading={busy}
                  disabled={!name.trim()}
                  onClick={() => answer("accept", { name, optionalItemIds: [...picked] })}
                >
                  <CheckCircle2 />
                  <span>Accept proposal</span>
                </Button>
                <Button appearance="outline" iconOnly={false} onClick={() => setDeclining(true)}>
                  <XCircle />
                  <span>Decline</span>
                </Button>
              </div>
            </>
          ) : (
            <>
              <Field label="Reason (optional)" htmlFor="reject-reason">
                <Textarea id="reject-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} />
              </Field>
              <div className="flex gap-2">
                <Button loading={busy} onClick={() => answer("reject", { reason: reason.trim() || undefined })}>
                  Decline proposal
                </Button>
                <Button appearance="outline" onClick={() => setDeclining(false)}>
                  Back
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
