import type { BadgeColor } from "@/lib/badge-color";

export const CONTRACT_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  generated: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  signed: "Signed",
  void: "Void",
};

export const CONTRACT_STATUS_COLOR: Record<string, BadgeColor> = {
  draft: "gray",
  generated: "gray",
  sent: "blue",
  viewed: "violet",
  signed: "success",
  void: "error",
};

export interface ContractSummary {
  id: string;
  title: string;
  status: string;
  version: number;
  proposalId: string | null;
  projectId: string | null;
  sentAt: string | null;
  signedAt: string | null;
  signedByName: string | null;
  createdAt: string;
}
