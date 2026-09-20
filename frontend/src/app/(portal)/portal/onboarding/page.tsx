"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Alert, Button, Card, EmptyState, Field, Input, NativeSelect, PageHeader, Textarea } from "@/components/ui";
import type { IntakeField, MyOnboarding } from "@/lib/onboarding";

export default function PortalIntakePage() {
  const { success } = useToast();
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

  const sections = useMemo(() => {
    const map = new Map<string, IntakeField[]>();
    for (const f of intake?.fields ?? []) map.set(f.section, [...(map.get(f.section) ?? []), f]);
    return [...map.entries()];
  }, [intake]);

  async function save(submit: boolean) {
    setError("");
    setSaving(submit ? "submit" : "draft");
    try {
      await apiFetch("/client-onboarding/mine/intake", { method: "PUT", body: JSON.stringify({ answers, submit }) });
      if (submit) {
        setIntake((prev) => (prev ? { ...prev, status: "submitted" } : prev));
        success("Thank you, your answers were sent");
      } else {
        success("Draft saved");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving("");
    }
  }

  const set = (key: string, value: string) => setAnswers((prev) => ({ ...prev, [key]: value }));

  if (intake === undefined) return <p className="py-10 text-center text-sm text-text-tertiary">Loading...</p>;
  if (!intake) {
    return (
      <div className="space-y-5">
        <Alert status="error">{error || "There is no questionnaire for you yet."}</Alert>
        <Link href="/portal/projects" className="text-sm text-neutral-brand-color hover:underline">
          Back to your projects
        </Link>
      </div>
    );
  }

  const submitted = intake.status === "submitted";

  return (
    <div className="space-y-5">
      <Link href="/portal/projects" className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="size-4" aria-hidden />
        Your projects
      </Link>
      <PageHeader title={intake.name} description="The more you share, the better we can plan your project. You can save and come back later." />

      {submitted ? (
        <EmptyState
          icon={<CheckCircle2 className="size-5" aria-hidden />}
          title="Questionnaire sent"
          description="Thank you. We have your answers and will use them to plan your project."
        />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(true);
          }}
          className="space-y-5"
        >
          {error && <Alert status="error">{error}</Alert>}
          {sections.map(([section, fields]) => (
            <Card key={section} className="space-y-4 p-5">
              <h2 className="text-sm font-semibold text-text-primary">{section}</h2>
              {fields.map((f) => (
                <Field key={f.key} label={f.label} htmlFor={`q-${f.key}`} required={f.required}>
                  {f.type === "textarea" ? (
                    <Textarea id={`q-${f.key}`} rows={3} maxLength={5000} value={answers[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                  ) : f.type === "select" ? (
                    <NativeSelect id={`q-${f.key}`} value={answers[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)}>
                      <option value="">Choose...</option>
                      {(f.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : (
                    <Input id={`q-${f.key}`} type={f.type === "url" ? "url" : "text"} maxLength={5000} value={answers[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                  )}
                </Field>
              ))}
            </Card>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button type="button" appearance="outline" loading={saving === "draft"} onClick={() => save(false)}>
              Save draft
            </Button>
            <Button type="submit" loading={saving === "submit"}>
              Send answers
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
