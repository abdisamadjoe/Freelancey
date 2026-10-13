"use client";

import { AuthHeading, AuthShell } from "@/components/app/auth";
import { Notice } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";

// Catches unexpected errors during branded login page rendering (e.g. API
// unreachable). The not-found case is handled by notFound() in the page itself.
export default function BrandedLoginError({
  // Part of the Next.js error-boundary contract; the raw message is never
  // surfaced to the user (it can carry internal API details).
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AuthShell>
      <div className="space-y-5">
        <AuthHeading title="Something went wrong" />
        <Notice status="error">Unable to load the login page. Please try again later.</Notice>
        <Button type="button" variant="primary" size="lg" className="w-full" onPress={reset}>
          Try again
        </Button>
      </div>
    </AuthShell>
  );
}
