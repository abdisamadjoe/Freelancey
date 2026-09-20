export type IntakeFieldType = "text" | "textarea" | "select" | "url";

export interface IntakeField {
  key: string;
  label: string;
  type: IntakeFieldType;
  section: string;
  required?: boolean;
  options?: string[];
}

export const DEFAULT_INTAKE_KEY = "website-intake";
export const DEFAULT_INTAKE_NAME = "Website project questionnaire";

/** Seeded per workspace the first time onboarding starts. Editable later; stored as data, not code. */
export const DEFAULT_INTAKE_FIELDS: IntakeField[] = [
  { key: "businessName", label: "Business name", type: "text", section: "Your business", required: true },
  { key: "overview", label: "Business overview", type: "textarea", section: "Your business", required: true },
  { key: "history", label: "Business history", type: "textarea", section: "Your business" },
  { key: "whatYouDo", label: "What do you do?", type: "textarea", section: "Your business" },
  { key: "vision", label: "Vision", type: "textarea", section: "Your business" },
  { key: "values", label: "Values", type: "textarea", section: "Your business" },
  { key: "productsServices", label: "Products or services", type: "textarea", section: "Your business" },
  { key: "targetAudience", label: "Target audience", type: "textarea", section: "Audience and goals", required: true },
  { key: "websiteGoal", label: "Main goal of the website", type: "textarea", section: "Audience and goals", required: true },
  { key: "usp", label: "What makes you different?", type: "textarea", section: "Audience and goals" },
  { key: "competitors", label: "Competitors or sites you like", type: "textarea", section: "Audience and goals" },
  {
    key: "websiteType",
    label: "Type of website",
    type: "select",
    section: "The website",
    options: ["Business or brochure site", "Online store", "Portfolio", "Blog or content site", "Web application", "Other"],
  },
  { key: "requiredPages", label: "Pages you need", type: "textarea", section: "The website" },
  { key: "requiredFunctionality", label: "Features you need (forms, booking, payments...)", type: "textarea", section: "The website" },
  { key: "callToAction", label: "Main call to action", type: "text", section: "The website" },
  {
    key: "hasBranding",
    label: "Do you have branding?",
    type: "select",
    section: "Branding and content",
    options: ["Yes, complete", "Partly", "No, I need it"],
  },
  { key: "logo", label: "Link to your logo files", type: "url", section: "Branding and content" },
  { key: "colors", label: "Brand colors", type: "text", section: "Branding and content" },
  { key: "fonts", label: "Fonts", type: "text", section: "Branding and content" },
  {
    key: "content",
    label: "Website content (text)",
    type: "select",
    section: "Branding and content",
    options: ["I will provide it", "I need help writing it", "A mix of both"],
  },
  { key: "images", label: "Link to images", type: "url", section: "Branding and content" },
  { key: "videos", label: "Link to videos", type: "url", section: "Branding and content" },
  { key: "domain", label: "Domain name (existing or wanted)", type: "text", section: "Technical" },
  { key: "hosting", label: "Hosting (existing provider, or none)", type: "text", section: "Technical" },
  { key: "technicalRequirements", label: "Technical requirements", type: "textarea", section: "Technical" },
  { key: "notes", label: "Anything else we should know?", type: "textarea", section: "Anything else" },
];

export const DEFAULT_ONBOARDING_ITEMS = [
  { kind: "sign_agreement", title: "Sign the agreement", description: "Review and sign the contract we sent you." },
  { kind: "pay_deposit", title: "Pay the deposit", description: "The deposit confirms your start date." },
  { kind: "intake", title: "Complete the project questionnaire", description: "Tell us about your business and what you need." },
  { kind: "upload_assets", title: "Upload your logo, images and content", description: "Add your files to the project." },
] as const;

export type OnboardingKind = (typeof DEFAULT_ONBOARDING_ITEMS)[number]["kind"] | "custom";
