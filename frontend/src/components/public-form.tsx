"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { Alert, Button, Card, Field, Input, NativeSelect, Textarea } from "@/components/ui";
import type { PublicFormData } from "@/lib/form-links";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function PublicForm({ token, initial }: { token: string; initial: PublicFormData }) {
  const [status, setStatus] = useState(initial.status);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const sections = useMemo(() => {
    const map = new Map<string, PublicFormData["fields"]>();
    for (const field of initial.fields) map.set(field.section, [...(map.get(field.section) ?? []), field]);
    return [...map.entries()];
  }, [initial.fields]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setAnswers((prev) => ({ ...prev, [key]: e.target.value }));

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
        throw new Error("__api__" + JSON.stringify(data.message ?? "Something went wrong. Please try again."));
      }
      setStatus("completed");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      if (text.startsWith("__api__")) {
        const parsed: unknown = JSON.parse(text.slice(7));
        setErrors(Array.isArray(parsed) ? (parsed as string[]) : [String(parsed)]);
      } else {
        setErrors([text]);
      }
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <div className="mb-6 text-center">
      {initial.logoUrl && (
        <Image src={initial.logoUrl} alt="" width={56} height={56} unoptimized className="mx-auto mb-3 size-14 rounded-lg object-contain" />
      )}
      <p className="text-sm text-text-tertiary">{initial.organizationName}</p>
      <h1 className="mt-1 text-2xl font-semibold text-text-primary">{initial.title}</h1>
      <p className="mt-1 text-sm text-text-tertiary">For {initial.clientName}</p>
    </div>
  );

  if (status === "completed") {
    return (
      <>
        {header}
        <Card className="p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-10 text-alert-success-title" aria-hidden />
          <h2 className="text-lg font-semibold text-text-primary">Thank you</h2>
          <p className="mt-1 text-sm text-text-tertiary">
            Your answers have been sent to {initial.organizationName}. You can close this page.
          </p>
        </Card>
      </>
    );
  }

  if (status === "expired") {
    return (
      <>
        {header}
        <Alert status="warning" title="This link has expired">
          Please ask {initial.organizationName} to send you a new one.
        </Alert>
      </>
    );
  }

  return (
    <>
      {header}
      <form onSubmit={submit} className="space-y-5" noValidate>
        {errors.length > 0 && (
          <Alert status="error">
            <ul className="list-disc pl-4">
              {errors.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </Alert>
        )}
        {sections.map(([section, fields]) => (
          <Card key={section} className="space-y-4 p-6">
            <h2 className="text-base font-semibold text-text-primary">{section}</h2>
            {fields.map((field) => (
              <Field key={field.key} label={field.label} htmlFor={`f-${field.key}`} required={field.required}>
                {field.type === "textarea" ? (
                  <Textarea id={`f-${field.key}`} rows={3} maxLength={5000} value={answers[field.key] ?? ""} onChange={set(field.key)} />
                ) : field.type === "select" ? (
                  <NativeSelect id={`f-${field.key}`} value={answers[field.key] ?? ""} onChange={set(field.key)}>
                    <option value="">Choose one</option>
                    {(field.options ?? []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </NativeSelect>
                ) : (
                  <Input
                    id={`f-${field.key}`}
                    type={field.type === "url" ? "url" : "text"}
                    maxLength={500}
                    value={answers[field.key] ?? ""}
                    onChange={set(field.key)}
                    placeholder={field.type === "url" ? "https://" : undefined}
                  />
                )}
              </Field>
            ))}
          </Card>
        ))}
        <Button type="submit" loading={busy}>
          Submit
        </Button>
      </form>
    </>
  );
}
