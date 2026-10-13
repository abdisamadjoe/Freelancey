"use client";

import { Notice, PageBody, PageHeader } from "@/components/app/kit";
import { BillingSection } from "@/components/app/settings/billing-section";
import { useAppConfig } from "@/lib/app-config";
import { Suspense } from "react";

export default function BillingPage() {
  const config = useAppConfig();
  const billingEnabled = config?.billingEnabled ?? false;

  return (
    <>
      <PageHeader title="Billing" description="Your plan, usage and payment methods for this workspace." />
      <PageBody className="mt-5">
        {config && !billingEnabled ? (
          <Notice status="info">Billing is not configured on this Freelancey instance.</Notice>
        ) : (
          <Suspense>
            <BillingSection />
          </Suspense>
        )}
      </PageBody>
    </>
  );
}
