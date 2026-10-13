"use client";

import { PageBody, PageHeader } from "@/components/app/kit";
import { PaymentsSection } from "@/components/app/settings/payments-section";

export default function PaymentsSettingsPage() {
  return (
    <>
      <PageHeader title="Client Payments" description="Accept invoice payments from clients via Stripe." />
      <PageBody className="mt-5">
        <PaymentsSection />
      </PageBody>
    </>
  );
}
