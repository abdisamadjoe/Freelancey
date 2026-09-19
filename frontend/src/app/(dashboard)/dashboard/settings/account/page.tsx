"use client";

import { PageHeader } from "@/components/ui";
import { useAppConfig } from "@/lib/app-config";
import { BillingSection } from "../billing/billing-section";
import { ProfileSection } from "../profile/profile-section";

export default function AccountSettingsPage(): React.ReactElement {
  const config = useAppConfig();
  const billingEnabled = config?.billingEnabled ?? false;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Account"
        description="Manage your personal details, password and account data."
      />
      <ProfileSection />
      {/* Billing lives behind the `#billing` hash used by plan-limit deep links
          (e.g. /dashboard/settings/account?reason=projects#billing). */}
      <section id="billing" className="scroll-mt-6">
        {billingEnabled ? <BillingSection /> : null}
      </section>
    </div>
  );
}
