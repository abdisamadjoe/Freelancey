export const HANDOVER_KINDS = ["files", "documentation", "access", "training", "deployment", "custom"] as const;

/** What a freelancer hands over at the end of a website project. Editable per project. */
export const DEFAULT_HANDOVER_ITEMS: { kind: (typeof HANDOVER_KINDS)[number]; title: string; details: string }[] = [
  { kind: "files", title: "Final files", details: "Source files, design files and exported assets." },
  { kind: "documentation", title: "Documentation", details: "How the site is built and how to update it." },
  { kind: "access", title: "Access information", details: "Hosting, domain, CMS and analytics access. Share passwords through a password manager, not here." },
  { kind: "training", title: "Training", details: "A walkthrough of how to manage the site." },
  { kind: "deployment", title: "Deployment information", details: "Where the site is hosted and how it is deployed." },
];
