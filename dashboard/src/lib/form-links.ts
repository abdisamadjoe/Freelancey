import type { IntakeField } from "@/lib/onboarding";

export type FormKind = "onboarding" | "project_brief";

export interface FormLinkSummary {
  id: string;
  kind: FormKind;
  projectId: string | null;
  status: "pending" | "completed" | "expired";
  expiresAt: string;
  completedAt: string | null;
  createdAt: string;
}

export interface PublicFormData {
  kind: FormKind;
  organizationName: string;
  primaryColor: string | null;
  logoUrl: string | null;
  clientName: string;
  status: "pending" | "completed" | "expired";
  title: string;
  fields: IntakeField[];
}

export interface FormAnswers {
  id: string;
  kind: FormKind;
  title: string;
  status: string;
  completedAt: string | null;
  fields: IntakeField[];
  answers: Record<string, string>;
}
