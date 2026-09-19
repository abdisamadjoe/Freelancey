"use client";

import { Alert, Button } from "@/components/ui";
import { AuthLayout } from "../../auth-layout";

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
    <AuthLayout>
      <div className="space-y-5 text-center">
        <h1 className="text-2xl leading-8 font-medium tracking-[-0.4px] text-text-primary">
          Something went wrong
        </h1>

        <Alert status="error" icon={null}>
          Unable to load the login page. Please try again later.
        </Alert>

        <Button type="button" variant="primary" size="lg" className="w-full" onClick={reset}>
          Try again
        </Button>
      </div>
    </AuthLayout>
  );
}
