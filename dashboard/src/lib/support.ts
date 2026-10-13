import type { BadgeColor } from "@/lib/badge-color";

export interface TicketRow {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  source: string;
  createdAt: string;
  client: { id: string; name: string; company: string | null };
  _count: { replies: number };
}

export interface TicketDetail extends Omit<TicketRow, "_count" | "client"> {
  projectId: string | null;
  projectName: string | null;
  submittedByName: string | null;
  submittedByEmail: string | null;
  client: { id: string; name: string; company: string | null; email: string | null };
  replies: { id: string; authorKind: string; authorName: string | null; message: string; createdAt: string }[];
}

export const TICKET_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
] as const;

export const TICKET_PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
] as const;

export const TICKET_STATUS_COLOR: Record<string, BadgeColor> = { open: "orange", in_progress: "blue", resolved: "success" };
export const TICKET_PRIORITY_COLOR: Record<string, BadgeColor> = { low: "gray", normal: "gray", high: "error" };
