"use client";

import { PageBody, PageHeader } from "@/components/app/kit";
import { BrandingPanel } from "@/components/app/settings/branding-panel";
import { GeneralSection } from "@/components/app/settings/general-section";
import { LabelsSection } from "@/components/app/settings/labels-section";

export default function WorkspaceSettingsPage() {
  return (
    <>
      <PageHeader title="Workspace" description="Branding, labels, email delivery and file settings for this workspace." />
      <PageBody className="mt-5">
        <BrandingPanel />
        <LabelsSection />
        <GeneralSection />
      </PageBody>
    </>
  );
}
