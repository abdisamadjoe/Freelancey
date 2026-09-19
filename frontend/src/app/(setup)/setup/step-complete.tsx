"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { CheckCircle, ArrowRight } from "lucide-react";
import { track } from "@/lib/track";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui";

interface StepCompleteProps {
  onBack: () => void;
}

const NEXT_STEPS = [
  {
    title: "Create projects",
    description: "and assign clients to give them portal access.",
  },
  {
    title: "Upload files",
    description: "to projects that clients can download from their portal.",
  },
  {
    title: "Post updates",
    description: "to keep your clients informed about project progress.",
  },
];

export function StepComplete({ onBack }: StepCompleteProps) {
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");

  const handleFinish = async () => {
    setCompleting(true);
    setError("");
    try {
      await apiFetch("/setup/complete", { method: "POST" });
      track("setup_completed");
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete setup");
      setCompleting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-col items-center justify-center gap-3 text-center">
        <span
          aria-hidden
          className="flex size-14 items-center justify-center rounded-full bg-badge-success-background text-badge-success-text [&>svg]:size-7"
        >
          <CheckCircle />
        </span>
        <div>
          <CardTitle>You are all set!</CardTitle>
          <CardDescription className="mx-auto mt-1 max-w-md">
            Your Freelancey instance is configured and ready to use. You can
            always adjust these settings later from the dashboard.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {error && <Alert status="error">{error}</Alert>}

        {/* Summary */}
        <div className="space-y-4 rounded-lg border-[0.5px] border-card-border bg-background-gray-secondary_alt_2 p-5">
          <p className="text-sm font-medium text-text-primary">
            What you can do next
          </p>
          <ul className="space-y-3">
            {NEXT_STEPS.map((step, index) => (
              <li key={step.title} className="flex items-start gap-3 text-sm">
                <span
                  aria-hidden
                  className="flex size-5 shrink-0 items-center justify-center rounded-full bg-background-gray-tertiary text-xs font-medium text-text-secondary"
                >
                  {index + 1}
                </span>
                <span className="text-text-secondary">
                  <span className="font-medium text-text-primary">
                    {step.title}
                  </span>{" "}
                  {step.description}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>

      <CardFooter className="justify-between">
        <Button appearance="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleFinish} loading={completing}>
          {completing ? "Finishing..." : "Go to Launchpad"}
          {!completing && <ArrowRight aria-hidden />}
        </Button>
      </CardFooter>
    </Card>
  );
}
