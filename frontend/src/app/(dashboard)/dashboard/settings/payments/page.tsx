"use client";

import { Card, CardContent, PageHeader } from "@/components/ui";
import { PaymentsSection } from "../system/payments-section";

export default function PaymentsSettingsPage(): React.ReactElement {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Client Payments"
        description="Accept invoice payments from clients via Stripe."
      />
      <Card>
        <CardContent className="mt-0 max-w-2xl">
          <PaymentsSection />
        </CardContent>
      </Card>
    </div>
  );
}
