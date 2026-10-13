"use client";


import { IntakeFields } from "@/components/app/intake-form";
import { PublicHeader } from "@/components/app/public";
import { ActionButton, Notice, Panel } from "@/components/app/kit";
import type { PublicFormData } from "@/lib/form-links";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function PublicForm({ token, initial }: { token: string; initial: PublicFormData }) {
  const [status, setStatus] = useState(initial.status);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    const missing = initial.fields.filter((f) => f.required && !answers[f.key]?.trim()).map((f) => `${f.label} is required`);
    if (missing.length > 0) {
      setErrors(missing);
      return;
    }
    setBusy(true);
    try {
      // Blank answers are left out; the API rejects empty strings for typed fields.
      const body = Object.fromEntries(Object.entries(answers).filter(([, v]) => v.trim() !== ""));
      const res = await fetch(`${API_URL}/api/forms/public/${encodeURIComponent(token)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: body }),
      });
      if (res.status === 429) throw new Error("Too many attempts. Please try again in a minute.");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.message ?? "Something went wrong. Please try again.";
        setErrors(Array.isArray(msg) ? msg : [String(msg)]);
        return;
      }
      setStatus("completed");
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Something went wrong. Please try again."]);
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <PublicHeader logoUrl={initial.logoUrl} eyebrow={initial.organizationName} title={initial.title} subtitle={`For ${initial.clientName}`} />
  );

  if (status === "completed") {
    return (
      <>
        {header}
        <Panel title="Thank you" description={`Your answers have been sent to ${initial.organizationName}. You can close this page.`} />
      </>
    );
  }

  if (status === "expired") {
    return (
      <>
        {header}
        <Notice status="warning">This link has expired. Please ask {initial.organizationName} to send you a new one.</Notice>
      </>
    );
  }

  return (
    <>
      {header}
      <form onSubmit={submit} className="space-y-5" noValidate>
        {errors.length > 0 && (
          <Notice status="error">
            <ul className="list-disc pl-5">
              {errors.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </Notice>
        )}
        <IntakeFields fields={initial.fields} answers={answers} onChange={(k, v) => setAnswers((p) => ({ ...p, [k]: v }))} />
        <ActionButton type="submit" variant="primary" loading={busy}>
          Submit
        </ActionButton>
      </form>
    </>
  );
}

