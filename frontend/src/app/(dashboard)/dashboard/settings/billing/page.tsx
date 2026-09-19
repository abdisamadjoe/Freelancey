"use client";

import { BillingSection } from "./billing-section";
import { useAppConfig } from "@/lib/app-config";
import { Alert, PageHeader } from "@/components/ui";

export default function BillingPage(): React.ReactElement {
  const config = useAppConfig();
  const billingEnabled = config?.billingEnabled ?? false;

  if (!billingEnabled) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Billing"
          description="Your plan, usage and payment methods for this workspace."
        />
        <Alert status="info">Billing is not configured on this Freelancey instance.</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Billing"
        description="Your plan, usage and payment methods for this workspace."
      />
      <BillingSection />
    </div>
  );
}
