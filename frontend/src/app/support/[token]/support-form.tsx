"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Alert, Button, Card, Field, Input, NativeSelect, Textarea } from "@/components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const INITIAL = { subject: "", message: "", projectId: "", name: "", email: "", hp: "" };

export function SupportForm({ token, projects }: { token: string; projects: { id: string; name: string }[] }) {
  const [v, setV] = useState(INITIAL);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: keyof typeof INITIAL) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setV((prev) => ({ ...prev, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      // Empty optional fields are omitted: the API rejects blank strings for typed fields like email.
      const body = Object.fromEntries(Object.entries(v).filter(([, val]) => val.trim() !== ""));
      const res = await fetch(`${API_URL}/api/support/public/${encodeURIComponent(token)}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 429) throw new Error("Too many attempts. Please try again in a minute.");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const text = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(text || "Something went wrong. Please try again.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 size-10 text-alert-success-title" aria-hidden />
        <h2 className="text-lg font-semibold text-text-primary">Request sent</h2>
        <p className="mt-1 text-sm text-text-tertiary">We have your message and will reply as soon as we can.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Alert status="error">{error}</Alert>}
        {projects.length > 0 && (
          <Field label="Which project?" htmlFor="s-project">
            <NativeSelect id="s-project" value={v.projectId} onChange={set("projectId")}>
              <option value="">Not sure</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}
        <Field label="Subject" htmlFor="s-subject" required>
          <Input id="s-subject" value={v.subject} onChange={set("subject")} maxLength={200} required />
        </Field>
        <Field label="What is happening?" htmlFor="s-message" required>
          <Textarea id="s-message" rows={5} value={v.message} onChange={set("message")} maxLength={5000} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" htmlFor="s-name">
            <Input id="s-name" value={v.name} onChange={set("name")} maxLength={200} autoComplete="name" />
          </Field>
          <Field label="Email for the reply" htmlFor="s-email">
            <Input id="s-email" type="email" value={v.email} onChange={set("email")} autoComplete="email" />
          </Field>
        </div>
        {/* Honeypot: hidden from people, filled by bots. */}
        <div aria-hidden className="absolute -left-[9999px]">
          <label htmlFor="s-hp">Leave this empty</label>
          <input id="s-hp" tabIndex={-1} autoComplete="off" value={v.hp} onChange={set("hp")} />
        </div>
        <Button type="submit" loading={sending} disabled={!v.subject.trim() || !v.message.trim()}>
          Send request
        </Button>
      </form>
    </Card>
  );
}
