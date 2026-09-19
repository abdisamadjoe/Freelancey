"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Check, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Alert,
  Button,
  Card,
  LoadingState,
  PageHeader,
  Progress,
} from "@/components/ui";
import { StepOrgProfile } from "./step-org-profile";
import { StepEmailConfig } from "./step-email-config";
import { StepFirstProject } from "./step-first-project";
import { StepInviteClient } from "./step-invite-client";
import { StepComplete } from "./step-complete";

const ALL_STEPS = [
  { key: "org", label: "Organization" },
  { key: "email", label: "Email" },
  { key: "project", label: "First Project" },
  { key: "invite", label: "Invite Client" },
  { key: "complete", label: "Complete" },
] as const;

function SetupWizardContent() {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(true);
  const [emailPreConfigured, setEmailPreConfigured] = useState(false);
  const [checkoutBanner, setCheckoutBanner] = useState<"success" | "cancelled" | null>(null);

  useEffect(() => {
    // Show checkout status banner
    const checkout = searchParams.get("checkout");
    if (checkout === "success" || checkout === "cancelled") {
      setCheckoutBanner(checkout);
      window.history.replaceState({}, "", "/setup");
    }
  }, [searchParams]);

  useEffect(() => {
    let redirecting = false;

    // Check if setup is already complete
    const statusPromise = apiFetch<{ completed: boolean; emailConfigured?: boolean }>(
      "/setup/status",
    )
      .then((res) => {
        if (res.completed) {
          redirecting = true;
          window.location.href = "/dashboard";
          return;
        }
        if (res.emailConfigured) setEmailPreConfigured(true);
      })
      .catch(() => {});

    // Load org name for pre-filling
    const orgNamePromise = apiFetch<{ organization: { name?: string } }>("/organizations/me")
      .then((session) => {
        if (session.organization.name) setOrgName(session.organization.name);
      })
      .catch(() => {});

    // Wait for both so the wizard never renders with a not-yet-loaded org
    // name — clicking Continue before /organizations/me resolves would
    // otherwise hit the "Organization name is required" validation error.
    Promise.all([statusPromise, orgNamePromise]).then(() => {
      if (!redirecting) setLoading(false);
    });
  }, []);

  if (loading) {
    return <LoadingState label="Loading…" className="min-h-[60vh]" />;
  }

  const STEPS = emailPreConfigured
    ? ALL_STEPS.filter((s) => s.key !== "email")
    : ALL_STEPS;

  const goNext = () =>
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Checkout status banner */}
      {checkoutBanner && (
        <Alert
          status={checkoutBanner === "success" ? "success" : "warning"}
          actions={
            <Button
              variant="ghost"
              appearance="ghost"
              size="xs"
              iconOnly
              aria-label="Dismiss"
              onClick={() => setCheckoutBanner(null)}
            >
              <X aria-hidden />
            </Button>
          }
        >
          {checkoutBanner === "success"
            ? "Payment successful! Your plan has been upgraded."
            : "Checkout was cancelled. You\u2019re on the Free plan \u2014 you can upgrade anytime from Settings."}
        </Alert>
      )}

      {/* Header */}
      <PageHeader
        title="Welcome to Freelancey"
        description="Let's get your client portal set up in a few quick steps."
      />

      {/* Stepper */}
      <Card className="space-y-4">
        <p className="text-xs font-semibold tracking-[-0.1px] text-text-secondary">
          Step {currentStep + 1} of {STEPS.length}
        </p>

        <Progress value={currentStep + 1} max={STEPS.length} className="h-1.5" />

        <ol className="flex items-center">
          {STEPS.map((step, index) => (
            <li
              key={step.key}
              className="flex flex-1 items-center last:flex-none"
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors [&>svg]:size-4",
                    index < currentStep
                      ? "bg-badge-success-background text-badge-success-text"
                      : index === currentStep
                        ? "bg-button-primary-background text-button-primary-text"
                        : "bg-background-gray-secondary text-text-tertiary",
                  )}
                >
                  {index < currentStep ? <Check aria-hidden /> : index + 1}
                </span>
                <span
                  className={cn(
                    "hidden text-sm whitespace-nowrap sm:inline",
                    index === currentStep
                      ? "font-medium text-text-primary"
                      : "text-text-tertiary",
                  )}
                >
                  {step.label}
                </span>
              </span>
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "mx-3 h-px min-w-3 flex-1 transition-colors",
                    index < currentStep
                      ? "bg-success-500"
                      : "bg-background-gray-tertiary",
                  )}
                />
              )}
            </li>
          ))}
        </ol>
      </Card>

      {/* Step Content */}
      <div>
        {STEPS[currentStep]?.key === "org" && (
          <StepOrgProfile orgName={orgName} onNext={goNext} />
        )}
        {STEPS[currentStep]?.key === "email" && (
          <StepEmailConfig onNext={goNext} onBack={goBack} />
        )}
        {STEPS[currentStep]?.key === "project" && (
          <StepFirstProject onNext={goNext} onBack={goBack} />
        )}
        {STEPS[currentStep]?.key === "invite" && (
          <StepInviteClient onNext={goNext} onBack={goBack} />
        )}
        {STEPS[currentStep]?.key === "complete" && <StepComplete onBack={goBack} />}
      </div>
    </div>
  );
}

export default function SetupWizardPage() {
  return (
    <Suspense>
      <SetupWizardContent />
    </Suspense>
  );
}
