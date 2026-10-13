export const PROJECT_STATUSES = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  IN_REVIEW: "in_review",
  COMPLETED: "completed",
} as const;

export type ProjectStatusValue =
  (typeof PROJECT_STATUSES)[keyof typeof PROJECT_STATUSES];

export const DEFAULT_STATUSES = [
  { name: "Not Started", slug: "not_started", order: 0, color: "#6b7280" },
  { name: "In Progress", slug: "in_progress", order: 1, color: "#3b82f6" },
  { name: "In Review", slug: "in_review", order: 2, color: "#f59e0b" },
  { name: "Completed", slug: "completed", order: 3, color: "#665df5" },
];

export const DEFAULT_BRANDING = {
  primaryColor: "#665df5",
  accentColor: "#ff6b5c",
};

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const DELETED_USER_SENTINEL = "deleted";

export const TASK_STATUSES = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  DONE: "done",
  CANCELLED: "cancelled",
} as const;

export type TaskStatusValue =
  (typeof TASK_STATUSES)[keyof typeof TASK_STATUSES];

export const TASK_STATUS_VALUES = Object.values(TASK_STATUSES);

export const TASK_TYPES = {
  CHECKBOX: "checkbox",
  DECISION: "decision",
} as const;

export type TaskTypeValue = (typeof TASK_TYPES)[keyof typeof TASK_TYPES];

export const DEFAULT_LABEL_COLOR = "#6b7280";

export const CALENDAR_EVENT_TYPES = [
  "task",
  "project_start",
  "project_end",
  "invoice_due",
] as const;

export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export type CalendarEvent =
  | {
      type: "task";
      id: string;
      date: string;
      title: string;
      status: string;
      projectId: string;
      projectName: string;
      assigneeId: string | null;
      assigneeName: string | null;
    }
  | {
      type: "project_start" | "project_end";
      id: string;
      date: string;
      title: string;
      projectId: string;
      projectName: string;
    }
  | {
      type: "invoice_due";
      id: string;
      date: string;
      title: string;
      status: string;
      projectId: string | null;
      projectName: string | null;
      amountCents: number;
    };

export interface OwnedOrg {
  id: string;
  name: string;
  isSoleOwner: boolean;
  memberCount: number;
}

export interface DeletionInfo {
  ownedOrganizations: OwnedOrg[];
}

export const CONTRACT_STATUSES = {
  DRAFT: "draft",
  GENERATED: "generated",
  SENT: "sent",
  VIEWED: "viewed",
  SIGNED: "signed",
  VOID: "void",
} as const;

export type ContractStatusValue = (typeof CONTRACT_STATUSES)[keyof typeof CONTRACT_STATUSES];

export const CONTRACT_TEMPLATES = [
  { id: "website-design", name: "Website Design & Development Agreement", description: "Website projects: scope, tech stack, deposit and final payment, timeline, client responsibilities, and revisions." },
] as const;

export type ContractTemplateId = (typeof CONTRACT_TEMPLATES)[number]["id"];

export interface ContractPartyInfo {
  name: string;
  company?: string;
  email: string;
  address?: string;
  website?: string;
}

export interface ContractParties {
  provider: ContractPartyInfo;
  client: ContractPartyInfo;
}

export interface ContractAgreementDates {
  title: string;
  effectiveDate?: string;
  startDate?: string;
  endDate?: string;
  /** Shown under the project timeline, e.g. how client delays affect delivery. */
  timelineNote?: string;
}

export interface ContractScopeDetails {
  projectDescription?: string;
  deliverables?: string[];
  servicesIncluded?: string;
  techStack?: string;
  revisionsCount?: number | string;
  outOfScope?: string;
}

export interface ContractPaymentScheduleItem {
  id: string;
  milestoneName: string;
  amountCents: number;
  dueDate?: string;
}

export interface ContractPaymentDetails {
  totalAmountCents: number;
  currency: string;
  depositCents?: number;
  paymentMethod?: string;
  latePaymentTerms?: string;
  schedule?: ContractPaymentScheduleItem[];
}

export interface ContractTermsConfig {
  intellectualPropertyEnabled: boolean;
  intellectualPropertyText?: string;
  confidentialityEnabled: boolean;
  confidentialityText?: string;
  revisionsEnabled: boolean;
  revisionsText?: string;
  clientResponsibilitiesEnabled: boolean;
  clientResponsibilitiesText?: string;
  providerResponsibilitiesEnabled: boolean;
  providerResponsibilitiesText?: string;
  terminationEnabled: boolean;
  terminationText?: string;
  refundsEnabled: boolean;
  refundsText?: string;
  liabilityEnabled: boolean;
  liabilityText?: string;
  disputeResolutionEnabled: boolean;
  disputeResolutionText?: string;
  governingLawEnabled: boolean;
  governingLawText?: string;
  additionalTermsEnabled: boolean;
  additionalTermsText?: string;
}

/** Clause keys in `ContractTermsConfig`, in the order they appear in a document. */
export const CONTRACT_CLAUSES = [
  { key: "intellectualProperty", title: "Intellectual Property" },
  { key: "confidentiality", title: "Confidentiality" },
  { key: "revisions", title: "Revisions & Scope Changes" },
  { key: "clientResponsibilities", title: "Client Responsibilities" },
  { key: "providerResponsibilities", title: "Provider Responsibilities" },
  { key: "termination", title: "Termination" },
  { key: "refunds", title: "Refund Policy" },
  { key: "liability", title: "Limitation of Liability" },
  { key: "disputeResolution", title: "Dispute Resolution" },
  { key: "governingLaw", title: "Governing Law" },
  { key: "additionalTerms", title: "Additional Terms" },
] as const;

export type ContractClauseKey = (typeof CONTRACT_CLAUSES)[number]["key"];

/**
 * Per-template presentation. Optional so contracts created before templates
 * existed keep rendering as a standard services agreement.
 */
export interface ContractLayout {
  /** Small label above the title, e.g. "NON-DISCLOSURE AGREEMENT". */
  documentLabel?: string;
  /** Heading for the scope section, e.g. "Purpose & confidential information". */
  scopeHeading?: string;
  /** Heading for the payment section. */
  paymentHeading?: string;
  showDeliverables?: boolean;
  showPayment?: boolean;
  /** Adds a "Project Timeline" section built from the agreement dates. */
  showTimeline?: boolean;
  /** Line above the parties' names on the cover, e.g. "Website Design Contract between:". */
  coverLabel?: string;
  /** Short paragraph at the top right of the cover. */
  coverSummary?: string;
  /** Names used for the two parties in the opening paragraph. */
  partyLabels?: { provider: string; client: string };
  /** Clauses listed first, in this order; any others follow in the default order. */
  clauseOrder?: ContractClauseKey[];
  /** Overrides the default title of a clause for this template. */
  clauseTitles?: Partial<Record<ContractClauseKey, string>>;
}

export const DEFAULT_CONTRACT_LAYOUT = {
  documentLabel: "SERVICE AGREEMENT",
  scopeHeading: "Scope of Services",
  paymentHeading: "Compensation & Payment",
  showDeliverables: true,
  showPayment: true,
  showTimeline: false,
  partyLabels: { provider: "Contractor", client: "Client" },
  coverSummary:
    "This document serves to act as a contract between the client and the contractor. It details the scope of the project, pricing, feedback rounds, and other terms that ensure all parties are in complete agreement for this project and engagement.",
} as const;

export function resolveContractLayout(content: { layout?: ContractLayout }) {
  return { ...DEFAULT_CONTRACT_LAYOUT, ...content.layout };
}

export function contractClauseTitle(content: { layout?: ContractLayout }, key: ContractClauseKey): string {
  return (
    content.layout?.clauseTitles?.[key] ??
    CONTRACT_CLAUSES.find((c) => c.key === key)?.title ??
    key
  );
}

/** Clause keys in display order for a document, honouring the template's `clauseOrder`. */
export function orderedContractClauses(content: { layout?: ContractLayout }): ContractClauseKey[] {
  const all = CONTRACT_CLAUSES.map((c) => c.key) as ContractClauseKey[];
  const first = (content.layout?.clauseOrder ?? []).filter((k) => all.includes(k));
  return [...first, ...all.filter((k) => !first.includes(k))];
}

export interface ContractContent {
  layout?: ContractLayout;
  parties: ContractParties;
  agreement: ContractAgreementDates;
  scope: ContractScopeDetails;
  payment: ContractPaymentDetails;
  terms: ContractTermsConfig;
}

