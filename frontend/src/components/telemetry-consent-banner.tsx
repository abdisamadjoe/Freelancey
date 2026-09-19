"use client";

import { useState } from "react";
import { Alert, Button } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { enableSentry } from "@/lib/sentry";

export function TelemetryConsentBanner() {
  const [dismissed, setDismissed] = useState(false);

  async function handleAccept() {
    await apiFetch("/settings", {
      method: "PATCH",
      body: JSON.stringify({ telemetryEnabled: true }),
    });
    enableSentry();
    setDismissed(true);
  }

  async function handleDecline() {
    await apiFetch("/settings", {
      method: "PATCH",
      body: JSON.stringify({ telemetryEnabled: false }),
    });
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <Alert
      status="info"
      className="mb-6"
      title="Help improve Freelancey"
      actions={
        <>
          <Button appearance="outline" size="sm" onClick={handleDecline}>
            No thanks
          </Button>
          <Button size="sm" onClick={handleAccept}>
            Share anonymously
          </Button>
        </>
      }
    >
      Share anonymous crash reports and error data with the Freelancey team to help us fix bugs and
      improve the product. No personal data or client information is ever included.
    </Alert>
  );
}
