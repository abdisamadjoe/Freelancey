"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Alert, Button, Field, Input } from "@/components/ui";
import { AuthLayout } from "../auth-layout";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // authClient.forgetPassword exists at runtime but TypeScript mistypes
      // it as non-callable due to a plugin type-merge collision with the
      // emailOTP client plugin Neon bundles by default; requestPasswordReset
      // is the same underlying action without that collision.
      const { error: resetError } = await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });
      if (resetError) {
        throw new Error(resetError.message || "Failed to send reset email");
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
            <MailCheck className="size-6" />
          </span>

          <div>
            <h1 className="text-2xl leading-8 font-medium tracking-[-0.4px] text-text-primary">
              Check your email
            </h1>
            <p className="mt-2 text-sm leading-5 text-text-tertiary">
              If an account exists for {email}, we sent a password reset link.
              Check your inbox and follow the instructions.
            </p>
          </div>

          <Link
            href="/login"
            className="text-sm font-medium text-brand-500 transition-colors hover:text-brand-600 hover:underline"
          >
            Back to sign in
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
            Forgot your password?
          </h1>
          <p className="mt-2 text-sm leading-5 text-text-tertiary">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert status="error">{error}</Alert>}

          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </Field>

          <Button type="submit" variant="primary" size="lg" className="w-full bg-brand-500 hover:bg-brand-600" loading={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        <p className="text-center text-sm text-text-tertiary">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-500 transition-colors hover:text-brand-600 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
