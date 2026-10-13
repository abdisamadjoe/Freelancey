import type { BadgeColor } from "@/lib/badge-color";

export interface ProposalItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  optional: boolean;
  selected: boolean;
}

export interface ProposalSummary {
  id: string;
  clientId: string;
  title: string;
  status: string;
  currency: string;
  validUntil: string | null;
  sentAt: string | null;
  totalCents: number;
  createdAt: string;
}

export interface ProposalDetail extends ProposalSummary {
  scope: string | null;
  deliverables: string | null;
  timeline: string | null;
  paymentTerms: string | null;
  revisionLimit: number | null;
  viewedAt: string | null;
  respondedAt: string | null;
  acceptedByName: string | null;
  rejectionReason: string | null;
  items: ProposalItem[];
  client: { id: string; name: string; company: string | null; email: string | null; stage: string };
}

export const PROPOSAL_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
};

export const PROPOSAL_STATUS_COLOR: Record<string, BadgeColor> = {
  draft: "gray",
  sent: "blue",
  viewed: "violet",
  accepted: "success",
  rejected: "error",
  expired: "orange",
};

export function formatMoney(cents: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

/** Required items plus any optional items marked selected. */
export function totalCents(items: Pick<ProposalItem, "quantity" | "unitPriceCents" | "optional" | "selected">[]): number {
  return items.reduce((sum, i) => (!i.optional || i.selected ? sum + i.quantity * i.unitPriceCents : sum), 0);
}
