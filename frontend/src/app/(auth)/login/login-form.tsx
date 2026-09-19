"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { authClient } from "@/lib/auth/client";
import { setActiveOrgAndRedirect } from "@/lib/api";
import { track } from "@/lib/track";
import { Alert, Button, Field, Input, Label, Spinner } from "@/components/ui";
import { AuthLayout } from "../auth-layout";

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
      <AuthLayout>
        <div className="flex flex-col items-center gap-3 text-center">
          <Spinner size={20} />
          <p className="text-sm text-text-tertiary">Signing you in...</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="text-center">
          {logoSrc && !hideLogo && (
            <div className="mb-4 flex justify-center">
              <Image
                src={logoSrc}
                alt={orgName ?? "Logo"}
                width={120}
                height={48}
                className="h-12 w-auto object-contain"
              />
            </div>
          )}
          <h1 className="text-2xl leading-8 font-medium tracking-[-0.4px] text-text-primary">
            {orgName ? `Sign in to ${orgName}` : "Sign in to Freelancey"}
          </h1>
          <p className="mt-2 text-sm leading-5 text-text-tertiary">
            Enter your credentials to continue
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

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-brand-500 transition-colors hover:text-brand-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full bg-brand-500 hover:bg-brand-600" loading={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-sm text-text-tertiary">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-brand-500 transition-colors hover:text-brand-600 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
