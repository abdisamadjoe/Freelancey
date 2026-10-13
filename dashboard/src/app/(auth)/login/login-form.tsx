"use client";

import { AuthHeading, AuthLink, AuthShell } from "@/components/app/auth";
import { ActionButton, Loading, Notice, TextInput } from "@/components/app/kit";
import { setActiveOrgAndRedirect } from "@/lib/api";
import { authClient } from "@/lib/auth/client";
import { track } from "@/lib/track";
import Link from "next/link";
import { useState } from "react";

interface LoginFormProps {
  orgName?: string;
  logoSrc?: string | null;
  hideLogo?: boolean;
}

export function LoginForm({ orgName, logoSrc, hideLogo }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: signInError } = await authClient.signIn.email({ email, password });
      if (signInError) {
        throw new Error(signInError.message || "Invalid credentials");
      }

      setRedirecting(true);
      window.location.href = await setActiveOrgAndRedirect("/portal/projects");
    } catch (err) {
      track("login_failed");
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  if (redirecting) {
    return (
      <AuthShell logoSrc={logoSrc} logoAlt={orgName} hideLogo={hideLogo}>
        <Loading label="Signing you in..." />
      </AuthShell>
    );
  }

  return (
    <AuthShell logoSrc={logoSrc} logoAlt={orgName} hideLogo={hideLogo}>
      <div className="space-y-6">
        <AuthHeading
          title={orgName ? `Sign in to ${orgName}` : "Sign in to Freelancey"}
          description="Enter your credentials to continue"
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Notice status="error">{error}</Notice>}

          <TextInput label="Email" type="email" value={email} onChange={setEmail} required placeholder="you@example.com" name="email" autoComplete="email" />

          <div className="space-y-1.5">
            <TextInput label="Password" type="password" value={password} onChange={setPassword} required name="password" autoComplete="current-password" />
            <div className="text-right">
              <AuthLink href="/forgot-password">Forgot password?</AuthLink>
            </div>
          </div>

          <ActionButton type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </ActionButton>
        </form>

        <p className="text-center text-sm text-text-tertiary">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-neutral-brand-color hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
