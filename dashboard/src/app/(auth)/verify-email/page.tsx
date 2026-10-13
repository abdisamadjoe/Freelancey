"use client";

import { AuthHeading, AuthLink, AuthShell } from "@/components/app/auth";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified") === "true";

  if (verified) {
    return (
      <AuthShell>
        <div className="space-y-6 text-center">
          <AuthHeading
            title="Email verified!"
            description="Your email address has been verified successfully. You can now sign in to your account."
          />
          <AuthLink href="/login">Sign in</AuthLink>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="space-y-6 text-center">
        <AuthHeading
          title="Check your email"
          description="We sent a verification link to your email address. Click the link to verify your account."
        />
        <p className="text-sm leading-5 text-text-tertiary">
          Didn&apos;t receive the email? Check your spam folder or <AuthLink href="/login">sign in</AuthLink> to
          request a new one.
        </p>
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
