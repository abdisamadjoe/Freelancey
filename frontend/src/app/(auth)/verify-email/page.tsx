"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Mail } from "lucide-react";
import { buttonStyles } from "@/components/ui";
import { AuthLayout } from "../auth-layout";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified") === "true";

  if (verified) {
    return (
      <AuthLayout>
        <div className="space-y-6 text-center">
          <span
            aria-hidden
            className="mx-auto flex size-12 items-center justify-center rounded-full bg-button-success-outline-background text-button-success-outline-text"
          >
            <CheckCircle2 className="size-6" />
          </span>

          <div>
            <h1 className="text-2xl leading-8 font-medium tracking-[-0.4px] text-text-primary">
              Email verified!
            </h1>
            <p className="mt-2 text-sm leading-5 text-text-tertiary">
              Your email address has been verified successfully. You can now sign
              in to your account.
            </p>
          </div>

          <Link
            href="/login"
            className={buttonStyles({ variant: "primary", size: "lg", className: "w-full" })}
          >
            Sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-6 text-center">
        <span
          aria-hidden
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-100 text-brand-500"
        >
          <Mail className="size-6" />
        </span>

        <div>
          <h1 className="text-2xl leading-8 font-medium tracking-[-0.4px] text-text-primary">
            Check your email
          </h1>
          <p className="mt-2 text-sm leading-5 text-text-tertiary">
            We sent a verification link to your email address. Click the link to
            verify your account.
          </p>
        </div>

        <p className="text-sm leading-5 text-text-tertiary">
          Didn&apos;t receive the email? Check your spam folder or{" "}
          <Link
            href="/login"
            className="font-medium text-brand-500 transition-colors hover:text-brand-600 hover:underline"
          >
            sign in
          </Link>{" "}
          to request a new one.
        </p>
      </div>
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
