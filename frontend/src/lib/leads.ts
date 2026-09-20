import type { BadgeColor } from "@/components/ui";

export interface ClientRecord {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  stage: string;
  leadStatus: string | null;
  source: string | null;
  interestedIn: string | null;
  estimatedBudgetCents: number | null;
  priority: string | null;
  nextFollowUpAt: string | null;
  lostReason: string | null;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
}

export interface ClientActivity {
  id: string;
  kind: string | null;
  action: string;
  detail: string | null;
  occurredAt: string;
  actor: { id: string; name: string | null };
}

export const LEAD_STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal_sent", label: "Proposal sent" },
] as const;

export const STAGE_OPTIONS = [
  { value: "lead", label: "Leads" },
  { value: "active", label: "Won (active clients)" },
  { value: "past", label: "Past clients" },
  { value: "lost", label: "Lost" },
  { value: "", label: "Everything" },
] as const;

export const LEAD_SOURCES = ["Website form", "Referral", "WhatsApp", "Instagram", "LinkedIn", "Cold outreach", "Other"];

export const ACTIVITY_KIND_OPTIONS = [
  { value: "note", label: "Note" },
  { value: "call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
] as const;

const LEAD_STATUS_COLORS: Record<string, BadgeColor> = {
  new: "blue",
  contacted: "sky",
  qualified: "violet",
  proposal_sent: "orange",
};

export function stageBadge(record: Pick<ClientRecord, "stage" | "leadStatus">): { label: string; color: BadgeColor } {
  if (record.stage === "active") return { label: "Won", color: "success" };
  if (record.stage === "past") return { label: "Past client", color: "gray" };
  if (record.stage === "lost") return { label: "Lost", color: "error" };
  const status = record.leadStatus ?? "new";
  const label = LEAD_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  return { label, color: LEAD_STATUS_COLORS[status] ?? "gray" };
}

/** Follow-ups due now or earlier count as overdue. */
export function isFollowUpDue(nextFollowUpAt: string | null): boolean {
  return Boolean(nextFollowUpAt) && new Date(nextFollowUpAt as string).getTime() <= Date.now();
}

/** "2026-09-21" for <input type="date">, from an ISO string. */
export function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export function contactLine(r: Pick<ClientRecord, "email" | "phone" | "whatsapp">): string {
  return [r.email, r.phone, r.whatsapp ? `WhatsApp ${r.whatsapp}` : null].filter(Boolean).join(" · ");
}
