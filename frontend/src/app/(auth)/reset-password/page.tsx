"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Alert, Button, Field, Input, buttonStyles } from "@/components/ui";
import { AuthLayout } from "../auth-layout";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  // Neon Auth's reset-password email links use `token`; keep `code` as a
  // fallback in case an old-style (Stack Auth) link is still bookmarked.
  const token = searchParams.get("token") || searchParams.get("code");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <AuthLayout>
        <div className="space-y-6 text-center">
          <span
            aria-hidden
            className="mx-auto flex size-12 items-center justify-center rounded-full bg-button-error-outline-background text-button-error-outline-text"
          >
            <TriangleAlert className="size-6" />
          </span>

          <div>
            <h1 className="text-2xl leading-8 font-medium tracking-[-0.4px] text-text-primary">
              Invalid Reset Link
            </h1>
            <p className="mt-2 text-sm leading-5 text-text-tertiary">
              This password reset link is missing or invalid.
            </p>
          </div>

          <Link
            href="/forgot-password"
            className="text-sm font-medium text-brand-500 transition-colors hover:text-brand-600 hover:underline"
          >
            Request a new reset link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      const { error: resetError } = await authClient.resetPassword({ newPassword: password, token });
      if (resetError) {
        throw new Error(
          resetError.message || "Failed to reset password. The link may have expired.",
        );
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
              Password reset
            </h1>
            <p className="mt-2 text-sm leading-5 text-text-tertiary">
              Your password has been reset successfully. You can now sign in with
              your new password.
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
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl leading-8 font-medium tracking-[-0.4px] text-text-primary">
            Set new password
          </h1>
          <p className="mt-2 text-sm leading-5 text-text-tertiary">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert status="error">{error}</Alert>}

          <Field label="New Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </Field>

          <Field label="Confirm Password" htmlFor="confirmPassword">
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </Field>

          <Button type="submit" variant="primary" size="lg" className="w-full bg-brand-500 hover:bg-brand-600" loading={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>

        <p className="text-center text-sm text-text-tertiary">
          <Link
            href="/login"
            className="font-medium text-brand-500 transition-colors hover:text-brand-600 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
