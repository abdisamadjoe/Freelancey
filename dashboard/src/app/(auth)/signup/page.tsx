"use client";

import { AuthHeading, AuthShell } from "@/components/app/auth";
import { ActionButton, Loading, Notice, StatusBadge, TextInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { useAppConfig } from "@/lib/app-config";
import { authClient } from "@/lib/auth/client";
import { track } from "@/lib/track";
import { cn } from "@/utils/cn";
import Link from "next/link";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface Plan {
  id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  priceLifetime: number;
  maxProjects: number;
  maxStorageMb: number;
  maxMembers: number;
  maxClients: number;
  maxSeats: number;
  isRecurring: boolean;
  features: string[];
  description: string;
}

function PlanSelectionStep({
  plans,
  lifetimeSeatsRemaining,
  selectedSlug,
  onSelect,
  onContinue,
  loading,
}: {
  plans: Plan[];
  lifetimeSeatsRemaining: number | null;
  selectedSlug: string;
  onSelect: (slug: string) => void;
  onContinue: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-6">
      <AuthHeading title="Choose your plan" description="Select a plan to get started. You can change it later." />

      {loading ? (
        <Loading />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const isSelected = selectedSlug === plan.slug;
            const price = plan.isRecurring
              ? `$${(plan.priceMonthly / 100).toFixed(0)}/mo`
              : plan.priceLifetime > 0
                ? `$${(plan.priceLifetime / 100).toFixed(0)}`
                : "Free";
            const soldOut =
              plan.slug === "lifetime" && lifetimeSeatsRemaining !== null && lifetimeSeatsRemaining <= 0;

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => !soldOut && onSelect(plan.slug)}
                disabled={soldOut}
                className={cn(
                  "flex flex-col gap-4 rounded-xl border-[0.5px] bg-card-background p-5 text-left transition",
                  isSelected ? "border-brand-500 ring-2 ring-brand-300" : "border-card-border hover:border-brand-300",
                  soldOut ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                )}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base leading-6 font-semibold tracking-[-0.2px] text-text-primary">{plan.name}</h3>
                    {isSelected && <StatusBadge color="primary">Selected</StatusBadge>}
                  </div>
                  <p className="text-sm leading-5 text-text-tertiary">{plan.description}</p>
                </div>

                <p className="text-2xl font-semibold text-text-primary">
                  {price}
                  {plan.isRecurring && <span className="text-sm font-normal text-text-tertiary"> /month</span>}
                  {!plan.isRecurring && plan.priceLifetime > 0 && (
                    <span className="text-sm font-normal text-text-tertiary"> one-time</span>
                  )}
                </p>

                {plan.slug === "lifetime" && lifetimeSeatsRemaining !== null && (
                  <StatusBadge color={soldOut ? "error" : "warning"}>
                    {soldOut ? "Sold out" : `${lifetimeSeatsRemaining} of ${plan.maxSeats} seats remaining`}
                  </StatusBadge>
                )}

                <ul className="flex flex-col gap-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm leading-5 text-text-secondary">
                      <span className="text-success-500">{"✓"}</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      )}

      <Button type="button" variant="primary" size="lg" onPress={onContinue} isDisabled={loading} className="mx-auto flex w-full max-w-sm">
        Continue
      </Button>

      <p className="text-center text-sm text-text-tertiary">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-neutral-brand-color hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  const config = useAppConfig();
  const billingEnabled = config?.billingEnabled ?? false;
  const signupsDisabled = config?.signupEnabled === false;

  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const planFromUrl = searchParams.get("plan");

  const [step, setStep] = useState<"plan" | "account">("account");
  const [selectedPlan, setSelectedPlan] = useState(planFromUrl || "free");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [lifetimeSeatsRemaining, setLifetimeSeatsRemaining] = useState<number | null>(null);
  const [plansLoading, setPlansLoading] = useState(false);

  // Switch to plan step once we know billing is enabled
  useEffect(() => {
    if (billingEnabled) {
      setStep("plan");
      setPlansLoading(true);
    }
  }, [billingEnabled]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [accountStep, setAccountStep] = useState<1 | 2>(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!billingEnabled) return;
    fetch(`${API_URL}/api/billing/plans`)
      .then((res) => res.json())
      .then((data) => {
        setPlans(data.plans ?? []);
        setLifetimeSeatsRemaining(data.lifetimeSeatsRemaining ?? null);
      })
      .catch(() => {
        // If plans fail to load, skip plan selection
        setStep("account");
      })
      .finally(() => setPlansLoading(false));
  }, [billingEnabled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accountStep === 1) {
      setError("");
      setAccountStep(2);
      return;
    }
    setLoading(true);
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase letter");
      setLoading(false);
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError("Password must contain at least one lowercase letter");
      setLoading(false);
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("Password must contain at least one number");
      setLoading(false);
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setError("Password must contain at least one special character");
      setLoading(false);
      return;
    }

    try {
      // 1. Create the identity in Better Auth
      const { error: signUpError } = await authClient.signUp.email({ email, password, name, callbackURL: "/verify-email?verified=true" });
      if (signUpError) {
        throw new Error(signUpError.message || "Signup failed");
      }

      // 2. Create the organization (authenticated via the session just established)
      const data = await apiFetch<{ success: boolean; organizationId?: string; checkoutUrl?: string }>(
        "/onboarding/signup",
        {
          method: "POST",
          body: JSON.stringify({
            orgName,
            ...(billingEnabled && selectedPlan !== "free" ? { planSlug: selectedPlan } : {}),
          }),
        },
      );

      // Redirect to Stripe Checkout if a checkout URL was returned
      if (data.checkoutUrl) {
        track("signup_completed", { plan: selectedPlan });
        window.location.href = data.checkoutUrl;
        return;
      }

      track("signup_completed", { plan: selectedPlan });
      window.location.href = "/setup";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  if (signupsDisabled) {
    return (
      <AuthShell>
        <div className="space-y-6 text-center">
          <AuthHeading
            title="Signups are disabled"
            description="This Gigly instance isn't accepting new signups. If you already have an account, you can sign in."
          />
          <Link href="/login" className="text-sm font-medium text-neutral-brand-color hover:underline">
            Go to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (step === "plan") {
    return (
      <AuthShell wide>
        <PlanSelectionStep
          plans={plans}
          lifetimeSeatsRemaining={lifetimeSeatsRemaining}
          selectedSlug={selectedPlan}
          onSelect={setSelectedPlan}
          onContinue={() => setStep("account")}
          loading={plansLoading}
        />
      </AuthShell>
    );
  }

  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const passed = checks.filter(Boolean).length;
  const strength = passed <= 2 ? "Weak" : passed <= 4 ? "Fair" : "Strong";
  const strengthBar = passed <= 2 ? "bg-error-500" : passed <= 4 ? "bg-warning-500" : "bg-success-500";
  const strengthText = passed <= 2 ? "text-error-500" : passed <= 4 ? "text-warning-500" : "text-success-500";

  const requirements = [
    { label: "At least 8 characters", met: checks[0] },
    { label: "One uppercase letter", met: checks[1] },
    { label: "One lowercase letter", met: checks[2] },
    { label: "One number", met: checks[3] },
    { label: "One special character", met: checks[4] },
  ];

  return (
    <AuthShell>
      <div className="space-y-6">
        <AuthHeading
          title="Create your account"
          description={accountStep === 1 ? "Step 1 of 2 · Your agency" : "Step 2 of 2 · Sign-in details"}
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Notice status="error">{error}</Notice>}

          {accountStep === 1 ? (
            <>
              <TextInput label="Your Name" value={name} onChange={setName} required name="name" />
              <TextInput label="Agency / Company Name" value={orgName} onChange={setOrgName} required name="orgName" />
              <ActionButton type="submit" variant="primary" size="lg" className="w-full">
                Continue
              </ActionButton>
            </>
          ) : (
            <>
              <TextInput label="Email" type="email" value={email} onChange={setEmail} required name="email" />

              <div className="flex flex-col gap-1.5">
                <TextInput label="Password" type="password" value={password} onChange={setPassword} required name="password" autoComplete="new-password" />

                {password.length > 0 && (
                  <div className="mt-0.5 flex flex-col gap-1.5">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={cn("h-1 flex-1 rounded-full", i <= passed ? strengthBar : "bg-background-gray-secondary")}
                        />
                      ))}
                    </div>
                    <p className={cn("text-xs font-medium", strengthText)}>{strength}</p>
                  </div>
                )}

                <ul className="mt-0.5 flex flex-col gap-1 text-xs leading-5 text-text-tertiary">
                  {requirements.map((requirement) => (
                    <li key={requirement.label} className={requirement.met ? "text-success-500" : undefined}>
                      {requirement.met ? "✓" : "•"} {requirement.label}
                    </li>
                  ))}
                </ul>
              </div>

              <ActionButton type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </ActionButton>
            </>
          )}
        </form>

        <div className="flex flex-col items-center gap-2 text-sm text-text-tertiary">
          {accountStep === 2 && (
            <button
              type="button"
              onClick={() => setAccountStep(1)}
              className="font-medium text-neutral-brand-color hover:underline"
            >
              Back
            </button>
          )}
          {accountStep === 1 && billingEnabled && (
            <button
              type="button"
              onClick={() => setStep("plan")}
              className="font-medium text-neutral-brand-color hover:underline"
            >
              Back to plans
            </button>
          )}
          <p>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-neutral-brand-color hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
