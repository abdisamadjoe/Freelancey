"use client";

import { Notice, PageBody, PageHeader } from "@/components/app/kit";
import { BillingSection } from "@/components/app/settings/billing-section";
import { ProfileSection } from "@/components/app/settings/profile-section";
import { useAppConfig } from "@/lib/app-config";
import { Suspense } from "react";

export default function AccountSettingsPage() {
  const config = useAppConfig();
  const billingEnabled = config?.billingEnabled ?? false;

  return (
    <>
      <PageHeader title="Account" description="Manage your personal details, password and account data." />
      <PageBody className="mt-5">
        <ProfileSection />
        {/* Billing lives behind the `#billing` hash used by plan-limit deep links. */}
        <section id="billing" className="scroll-mt-6">
          {billingEnabled ? (
            <Suspense>
              <BillingSection />
            </Suspense>
          ) : null}
        </section>
        {!billingEnabled && config && <Notice status="info">Billing is not configured on this Freelancey instance.</Notice>}
      </PageBody>
    </>
  );
}
