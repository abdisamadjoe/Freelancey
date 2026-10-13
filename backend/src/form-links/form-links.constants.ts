import type { IntakeField } from "../client-onboarding/intake-template";

export const FORM_KINDS = ["onboarding", "project_brief"] as const;
export type FormKind = (typeof FORM_KINDS)[number];

/** How long a form link works after it is sent. */
export const LINK_TTL_DAYS = 30;

export const BRIEF_TITLE = "Project brief";

/** "Tell me about this project", as opposed to onboarding's "tell me about your business". */
export const PROJECT_BRIEF_FIELDS: IntakeField[] = [
  { key: "goals", label: "What should this project achieve?", type: "textarea", section: "Goals", required: true },
  { key: "successCriteria", label: "How will we know it was a success?", type: "textarea", section: "Goals", required: true },
  { key: "pages", label: "Pages or screens you need", type: "textarea", section: "What to build" },
  { key: "features", label: "Features you need", type: "textarea", section: "What to build" },
  { key: "integrations", label: "Integrations (payments, email, booking, analytics...)", type: "textarea", section: "What to build" },
  { key: "references", label: "Examples you like, with what you like about them", type: "textarea", section: "What to build" },
  { key: "technicalRequirements", label: "Technical requirements", type: "textarea", section: "Technical" },
  {
    key: "content",
    label: "Who provides the content?",
    type: "select",
    section: "Content and timing",
    options: ["I will provide it", "I need help writing it", "A mix of both"],
  },
  { key: "contentLink", label: "Link to your content or files", type: "url", section: "Content and timing" },
  { key: "deadline", label: "Deadline or launch date", type: "text", section: "Content and timing" },
  { key: "notes", label: "Anything else we should know?", type: "textarea", section: "Content and timing" },
];
