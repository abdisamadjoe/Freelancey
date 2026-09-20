"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Alert, Button, Card, Field, Input, Textarea } from "@/components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const INITIAL = { name: "", email: "", phone: "", whatsapp: "", company: "", website: "", interestedIn: "", budget: "", message: "", hp: "" };

export function ContactForm({ slug }: { slug: string }) {
  const [v, setV] = useState(INITIAL);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: keyof typeof INITIAL) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((prev) => ({ ...prev, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!v.email.trim() && !v.phone.trim() && !v.whatsapp.trim()) {
      setError("Please add an email, phone or WhatsApp number so we can reach you.");
      return;
    }
    setSending(true);
    try {
      // Empty optional fields are omitted: the API rejects blank strings for typed fields like email.
      const body = Object.fromEntries(Object.entries(v).filter(([, val]) => val.trim() !== ""));
      const res = await fetch(`${API_URL}/api/leads/public/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 429) throw new Error("Too many attempts. Please try again in a minute.");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(message || "Something went wrong. Please try again.");
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
        <h2 className="text-lg font-semibold text-text-primary">Thank you</h2>
        <p className="mt-1 text-sm text-text-tertiary">Your message has been sent. We will be in touch soon.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Alert status="error">{error}</Alert>}
        <Field label="Your name" htmlFor="c-name" required>
          <Input id="c-name" value={v.name} onChange={set("name")} required maxLength={200} autoComplete="name" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor="c-email">
            <Input id="c-email" type="email" value={v.email} onChange={set("email")} autoComplete="email" />
          </Field>
          <Field label="Phone" htmlFor="c-phone">
            <Input id="c-phone" type="tel" value={v.phone} onChange={set("phone")} autoComplete="tel" />
          </Field>
          <Field label="WhatsApp" htmlFor="c-wa">
            <Input id="c-wa" type="tel" value={v.whatsapp} onChange={set("whatsapp")} />
          </Field>
          <Field label="Company" htmlFor="c-company">
            <Input id="c-company" value={v.company} onChange={set("company")} autoComplete="organization" />
          </Field>
          <Field label="What do you need?" htmlFor="c-interest">
            <Input id="c-interest" value={v.interestedIn} onChange={set("interestedIn")} placeholder="e.g. New website" />
          </Field>
          <Field label="Budget" htmlFor="c-budget">
            <Input id="c-budget" value={v.budget} onChange={set("budget")} placeholder="e.g. $1,000 to $3,000" />
          </Field>
        </div>
        <Field label="Message" htmlFor="c-message">
          <Textarea id="c-message" rows={4} value={v.message} onChange={set("message")} maxLength={3000} />
        </Field>

        {/* Honeypot: hidden from people and assistive tech, bots fill it in. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Leave this empty
            <input tabIndex={-1} autoComplete="off" value={v.hp} onChange={set("hp")} />
          </label>
        </div>

        <Button type="submit" loading={sending} className="w-full">
          {sending ? "Sending..." : "Send message"}
        </Button>
        <p className="text-center text-xs text-text-tertiary">
          Your details are only used to reply to your message.
        </p>
      </form>
    </Card>
  );
}
