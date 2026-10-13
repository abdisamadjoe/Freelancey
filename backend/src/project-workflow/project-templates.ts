export interface TemplateMilestone {
  title: string;
  description: string;
  tasks: string[];
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  milestones: TemplateMilestone[];
}

/** Starting workflows. Applying one creates the milestones and their tasks; everything stays editable. */
export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "website",
    name: "Website project",
    description: "Discovery to handover for a marketing or brochure website.",
    milestones: [
      { title: "Discovery", description: "Agree goals, audience and the sitemap.", tasks: ["Review the project brief", "Agree the sitemap", "Confirm the timeline"] },
      { title: "Content", description: "Collect and shape the words and images.", tasks: ["Collect logo, images and copy", "Write or edit page copy", "Get content approved"] },
      { title: "UI/UX design", description: "Design the key screens.", tasks: ["Design the homepage", "Design inner pages", "Get design approved"] },
      { title: "Development", description: "Build the site.", tasks: ["Set up the project and hosting", "Build the pages", "Add forms and integrations"] },
      { title: "Testing", description: "Check it works everywhere.", tasks: ["Test on mobile and desktop", "Test forms and integrations", "Fix reported issues"] },
      { title: "Launch", description: "Go live.", tasks: ["Connect the domain", "Go live", "Check analytics and search indexing"] },
      { title: "Handover", description: "Give the client everything they need.", tasks: ["Hand over files and access", "Share documentation", "Train the client"] },
    ],
  },
];

export function findTemplate(id: string): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find((t) => t.id === id);
}
