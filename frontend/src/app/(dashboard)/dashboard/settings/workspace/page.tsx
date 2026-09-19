"use client";

import { PageHeader } from "@/components/ui";
import { BrandingPageSection } from "../branding/branding-page-section";
import { GeneralSection } from "../general/general-section";

export default function WorkspaceSettingsPage(): React.ReactElement {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Workspace"
        description="Branding, labels, email delivery and file settings for this workspace."
      />
      <BrandingPageSection />
      <GeneralSection />
    </div>
  );
}
