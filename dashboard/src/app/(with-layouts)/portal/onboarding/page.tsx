"use client";

import { IntakeFields } from "@/components/app/intake-form";
import { ActionButton, Empty, Loading, Notice, Page, PageBody, PageHeader } from "@/components/app/kit";
import { apiFetch } from "@/lib/api";
import type { MyOnboarding } from "@/lib/onboarding";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function PortalIntakePage() {
  const [intake, setIntake] = useState<MyOnboarding["intake"] | undefined>(undefined);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<"" | "draft" | "submit">("");

  useEffect(() => {
    apiFetch<MyOnboarding>("/client-onboarding/mine")
      .then((res) => {
        setIntake(res.intake);
        setAnswers(res.intake?.answers ?? {});
      })
      .catch((err) => {
        setIntake(null);
        setError(err instanceof Error ? err.message : "Failed to load");
      });
  }, []);

  async function save(submit: boolean) {
    setError("");
    setSaving(submit ? "submit" : "draft");
    try {
      await apiFetch("/client-onboarding/mine/intake", { method: "PUT", body: JSON.stringify({ answers, submit }) });
      if (submit) {
        setIntake((prev) => (prev ? { ...prev, status: "submitted" } : prev));
        toast.success("Thank you, your answers were sent");
      } else {
        toast.success("Draft saved");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving("");
    }
  }

  if (intake === undefined) return <Loading />;
  if (!intake) {
    return (
      <Page>
        <PageBody>
          <Notice status="error">{error || "There is no questionnaire for you yet."}</Notice>
          <Link href="/portal/projects" className="text-sm text-neutral-brand-color hover:underline">
            Back to your projects
          </Link>
        </PageBody>
      </Page>
    );
  }

  const submitted = intake.status === "submitted";

  return (
    <Page>
      <PageHeader title={intake.name} description="The more you share, the better we can plan your project. You can save and come back later." />
      <PageBody>
        {submitted ? (
          <Empty>Questionnaire sent. Thank you. We have your answers and will use them to plan your project.</Empty>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save(true);
            }}
            className="space-y-5"
          >
            {error && <Notice status="error">{error}</Notice>}
            <IntakeFields fields={intake.fields} answers={answers} onChange={(k, v) => setAnswers((p) => ({ ...p, [k]: v }))} />
            <div className="flex flex-wrap gap-2">
              <ActionButton appearance="outline" variant="primary" loading={saving === "draft"} onPress={() => save(false)}>
                Save draft
              </ActionButton>
              <ActionButton type="submit" variant="primary" loading={saving === "submit"}>
                Send answers
              </ActionButton>
            </div>
          </form>
        )}
      </PageBody>
    </Page>
  );
}
