export interface ProjectReadiness {
  hasClient: boolean;
  onboarding: boolean;
  brief: boolean;
  contract: boolean;
  ready: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: string;
  order: number;
  taskCount: number;
  doneCount: number;
}

export interface ProjectTemplateInfo {
  id: string;
  name: string;
  description: string;
  milestones: string[];
}

export const MILESTONE_STATUS_OPTIONS = [
  { value: "pending", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
] as const;

export interface Meeting {
  id: string;
  title: string;
  scheduledAt: string;
  durationMin: number | null;
  location: string | null;
  notes: string | null;
}

export interface Expense {
  id: string;
  description: string;
  amountCents: number;
  currency: string;
  incurredOn: string;
  category: string | null;
  billable: boolean;
}

export interface ExpenseList {
  data: Expense[];
  totalCents: number;
  billableCents: number;
}

export interface DeliverableLink {
  label: string;
  url: string;
}

export interface ChangeRequestRow {
  id: string;
  version: number;
  message: string;
  status: string;
  createdAt: string;
}

export interface DeliverableRow {
  id: string;
  milestoneId: string | null;
  title: string;
  description: string | null;
  links: DeliverableLink[];
  version: number;
  status: string;
  sentAt: string | null;
  approvedAt: string | null;
  approvedByName: string | null;
  changeRequests: ChangeRequestRow[];
}

export interface DeliverableList {
  data: DeliverableRow[];
  revisions: { used: number; allowed: number | null };
  overLimit: boolean;
}

export const DELIVERABLE_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  in_review: "With the client",
  changes_requested: "Changes requested",
  approved: "Approved",
};

export const DELIVERABLE_STATUS_COLOR: Record<string, "gray" | "blue" | "orange" | "success"> = {
  draft: "gray",
  in_review: "blue",
  changes_requested: "orange",
  approved: "success",
};

export interface Blocker {
  kind: string;
  label: string;
  count: number;
}

export interface CompletionCheck {
  completed: boolean;
  blockers: Blocker[];
  canComplete: boolean;
}

export interface HandoverItemRow {
  id: string;
  kind: string;
  title: string;
  details: string | null;
  linkUrl: string | null;
  done: boolean;
}

export interface HandoverData {
  id: string;
  status: string;
  shared: boolean;
  completedAt: string | null;
  items: HandoverItemRow[];
}
