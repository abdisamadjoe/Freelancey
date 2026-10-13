"use client";

import { Notice } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { useState } from "react";

/** Asks the owner once whether to share anonymous error reports. */
export function TelemetryConsentBanner() {
  const [dismissed, setDismissed] = useState(false);

  async function answer(telemetryEnabled: boolean) {
    await apiFetch("/settings", { method: "PATCH", body: JSON.stringify({ telemetryEnabled }) });
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="mt-6 space-y-3 px-2 lg:px-5">
      <Notice status="info">
        <span className="block font-medium">Help improve Freelancey</span>
        Share anonymous crash reports and error data with the Freelancey team to help us fix bugs and improve the product. No personal data or
        client information is ever included.
      </Notice>
      <div className="flex gap-2">
        <Button size="sm" appearance="outline" variant="primary" onPress={() => answer(false)}>
          No thanks
        </Button>
        <Button size="sm" variant="primary" onPress={() => answer(true)}>
          Share anonymously
        </Button>
      </div>
    </div>
  );
}
