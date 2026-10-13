"use client";

import { AuthHeading, AuthLink, AuthShell } from "@/components/app/auth";
import { ActionButton, Notice, TextInput } from "@/components/app/kit";
import { authClient } from "@/lib/auth/client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  // Better Auth's reset-password links redirect here with `?token=`; `code` is
  // kept as a fallback for older links.
  const token = searchParams.get("token") || searchParams.get("code");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <AuthShell>
        <div className="space-y-6 text-center">
          <AuthHeading title="Invalid Reset Link" description="This password reset link is missing or invalid." />
          <AuthLink href="/forgot-password">Request a new reset link</AuthLink>
        </div>
      </AuthShell>
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
        throw new Error(resetError.message || "Failed to reset password. The link may have expired.");
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
            title="Password reset"
            description="Your password has been reset successfully. You can now sign in with your new password."
          />
          <AuthLink href="/login">Sign in</AuthLink>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="space-y-6">
        <AuthHeading title="Set new password" description="Enter your new password below" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Notice status="error">{error}</Notice>}
          <TextInput label="New Password" type="password" value={password} onChange={setPassword} required name="password" autoComplete="new-password" />
          <TextInput label="Confirm Password" type="password" value={confirmPassword} onChange={setConfirmPassword} required name="confirmPassword" autoComplete="new-password" />
          <ActionButton type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </ActionButton>
        </form>

        <p className="text-center">
          <AuthLink href="/login">Back to sign in</AuthLink>
        </p>
      </div>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
