"use client";

import { AuthHeading, AuthLink, AuthShell } from "@/components/app/auth";
import { ActionButton, Notice, TextInput } from "@/components/app/kit";
import { authClient } from "@/lib/auth/client";
import { useState } from "react";

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
      <AuthShell>
        <div className="space-y-6 text-center">
          <AuthHeading
            title="Check your email"
            description={`If an account exists for ${email}, we sent a password reset link. Check your inbox and follow the instructions.`}
          />
          <AuthLink href="/login">Back to sign in</AuthLink>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="space-y-6">
        <AuthHeading title="Forgot your password?" description="Enter your email and we'll send you a reset link" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Notice status="error">{error}</Notice>}
          <TextInput label="Email" type="email" value={email} onChange={setEmail} required placeholder="you@example.com" name="email" />
          <ActionButton type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </ActionButton>
        </form>

        <p className="text-center text-sm text-text-tertiary">
          Remember your password? <AuthLink href="/login">Sign in</AuthLink>
        </p>
      </div>
    </AuthShell>
  );
}
