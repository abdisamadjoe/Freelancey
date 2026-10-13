export interface IntakeField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "url";
  section: string;
  required?: boolean;
  options?: string[];
}

export interface OnboardingProgress {
  done: number;
  total: number;
  complete: boolean;
}

/** Staff view of a checklist step. */
export interface OnboardingItemStaff {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  done: boolean;
  linkedType: string | null;
  linkedId: string | null;
  linkedLabel: string | null;
  linkedStatus: string | null;
}

export interface StaffOnboarding {
  started: boolean;
  items: OnboardingItemStaff[];
  progress: OnboardingProgress;
  contacts: { id: string; name: string; email: string | null; userId: string | null; isPrimary: boolean }[];
  intake: {
    id: string;
    name: string;
    fields: IntakeField[];
    answers: Record<string, string>;
    status: "draft" | "submitted";
    submittedAt: string | null;
  } | null;
}

/** Client (portal) view of a checklist step. */
export interface OnboardingItemMine {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  done: boolean;
  linkedType: string | null;
  projectId: string | null;
  canToggle: boolean;
}

export interface MyOnboarding {
  items: OnboardingItemMine[];
  progress: OnboardingProgress;
  intake: {
    name: string;
    fields: IntakeField[];
    answers: Record<string, string>;
    status: "draft" | "submitted";
  } | null;
}

/** Where a client goes to finish a step. */
export function portalStepHref(item: Pick<OnboardingItemMine, "kind" | "projectId">): string {
  if (item.kind === "intake") return "/portal/onboarding";
  return item.projectId ? `/portal/projects/${item.projectId}` : "/portal/projects";
}
