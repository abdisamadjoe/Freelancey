"use client";

import { AuthHeading, AuthShell } from "@/components/app/auth";
import { ActionButton, Notice, TextInput } from "@/components/app/kit";
import { apiFetch, setActiveOrgAndRedirect } from "@/lib/api";
import { authClient } from "@/lib/auth/client";
import { track } from "@/lib/track";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

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
      <AuthShell>
        <AuthHeading title="Invalid Invitation" description="This invitation link is missing or invalid." />
      </AuthShell>
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
              throw new Error(loginError.message || "Account exists but login failed. Try signing in instead.");
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
      const acceptData = await apiFetch<{ organizationId: string }>("/organizations/accept-invitation", {
        method: "POST",
        body: JSON.stringify({ invitationId }),
      });

      // Step 3: Set active organization and redirect by role. Pinning to the
      // org we just joined matters because users who already belong to
      // another org (e.g. their own agency) would otherwise be routed to
      // that org's dashboard/setup instead of the invited org's portal.
      track("invite_accepted");
      window.location.href = await setActiveOrgAndRedirect("/portal", acceptData.organizationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="space-y-6">
        <AuthHeading
          title="Join Project Portal"
          description={
            mode === "signup" ? "Create an account to access your project" : "Sign in to accept your invitation"
          }
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Notice status="error">{error}</Notice>}

          {mode === "signup" && <TextInput label="Your Name" value={name} onChange={setName} required name="name" />}
          <TextInput label="Email" type="email" value={email} onChange={setEmail} required name="email" />
          <TextInput label="Password" type="password" value={password} onChange={setPassword} required name="password" />

          <ActionButton type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
            {loading ? "Processing..." : mode === "signup" ? "Create Account & Join" : "Sign In & Join"}
          </ActionButton>
        </form>

        <p className="text-center text-sm text-text-tertiary">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <button onClick={() => setMode("login")} className="font-medium text-neutral-brand-color hover:underline">
                Sign in instead
              </button>
            </>
          ) : (
            <>
              Need an account?{" "}
              <button onClick={() => setMode("signup")} className="font-medium text-neutral-brand-color hover:underline">
                Sign up
              </button>
            </>
          )}
        </p>
      </div>
    </AuthShell>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteContent />
    </Suspense>
  );
}
