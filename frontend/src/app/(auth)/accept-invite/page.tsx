"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { apiFetch, setActiveOrgAndRedirect } from "@/lib/api";
import { track } from "@/lib/track";
import { Alert, Button, Field, Input } from "@/components/ui";
import { AuthLayout } from "../auth-layout";

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const invitationId = searchParams.get("id");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signup" | "login">("signup");

  if (!invitationId) {
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
              Invalid Invitation
            </h1>
            <p className="mt-2 text-sm leading-5 text-text-tertiary">
              This invitation link is missing or invalid.
            </p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Step 1: Sign up or login
      if (mode === "signup") {
        const { error: signUpError } = await authClient.signUp.email({ email, password, name });
        if (signUpError) {
          // If the account already exists, auto-switch to login and retry
          if (signUpError.message?.toLowerCase().includes("already")) {
            const { error: loginError } = await authClient.signIn.email({ email, password });
            if (loginError) {
              throw new Error(
                loginError.message || "Account exists but login failed. Try signing in instead.",
              );
            }
            setMode("login");
          } else {
            throw new Error(signUpError.message || "Signup failed");
          }
        }
      } else {
        const { error: loginError } = await authClient.signIn.email({ email, password });
        if (loginError) {
          throw new Error(loginError.message || "Login failed");
        }
      }

      // Step 2: Accept the invitation
      const acceptData = await apiFetch<{ organizationId: string }>(
        "/organizations/accept-invitation",
        { method: "POST", body: JSON.stringify({ invitationId }) },
      );

      // Step 3: Set active organization and redirect by role. Pinning to the
      // org we just joined matters because users who already belong to
      // another org (e.g. their own agency) would otherwise be routed to
      // that org's dashboard/setup instead of the invited org's portal.
      track("invite_accepted");
      window.location.href = await setActiveOrgAndRedirect(
        "/portal",
        acceptData.organizationId,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl leading-8 font-medium tracking-[-0.4px] text-text-primary">
            Join Project Portal
          </h1>
          <p className="mt-2 text-sm leading-5 text-text-tertiary">
            {mode === "signup"
              ? "Create an account to access your project"
              : "Sign in to accept your invitation"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert status="error">{error}</Alert>}

          {mode === "signup" && (
            <Field label="Your Name" htmlFor="name">
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
          )}

          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </Field>

          <Button type="submit" variant="primary" size="lg" className="w-full bg-brand-500 hover:bg-brand-600" loading={loading}>
            {loading
              ? "Processing..."
              : mode === "signup"
                ? "Create Account & Join"
                : "Sign In & Join"}
          </Button>
        </form>

        <p className="text-center text-sm text-text-tertiary">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setMode("login")}
                className="font-medium text-brand-500 transition-colors hover:text-brand-600 hover:underline"
              >
                Sign in instead
              </button>
            </>
          ) : (
            <>
              Need an account?{" "}
              <button
                onClick={() => setMode("signup")}
                className="font-medium text-brand-500 transition-colors hover:text-brand-600 hover:underline"
              >
                Sign up
              </button>
            </>
          )}
        </p>
      </div>
    </AuthLayout>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteContent />
    </Suspense>
  );
}
