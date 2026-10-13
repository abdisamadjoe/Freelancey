"use client";

import { ActionButton, FormGrid, Notice, Panel, TextAreaInput, TextInput } from "@/components/app/kit";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const INITIAL = { name: "", email: "", phone: "", whatsapp: "", company: "", website: "", interestedIn: "", budget: "", message: "", hp: "" };

export function ContactForm({ slug }: { slug: string }) {
  const [v, setV] = useState(INITIAL);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: keyof typeof INITIAL) => (val: string) => setV((prev) => ({ ...prev, [key]: val }));

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
      <Panel title="Thank you" description="Your message has been sent. We will be in touch soon." />
    );
  }

  return (
    <Panel>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Notice status="error">{error}</Notice>}
        <TextInput label="Your name" required value={v.name} onChange={set("name")} autoComplete="name" />
        <FormGrid>
          <TextInput label="Email" type="email" value={v.email} onChange={set("email")} autoComplete="email" />
          <TextInput label="Phone" type="tel" value={v.phone} onChange={set("phone")} autoComplete="tel" />
          <TextInput label="WhatsApp" type="tel" value={v.whatsapp} onChange={set("whatsapp")} />
          <TextInput label="Company" value={v.company} onChange={set("company")} autoComplete="organization" />
          <TextInput label="What do you need?" value={v.interestedIn} onChange={set("interestedIn")} placeholder="e.g. New website" />
          <TextInput label="Budget" value={v.budget} onChange={set("budget")} placeholder="e.g. $1,000 to $3,000" />
        </FormGrid>
        <TextAreaInput label="Message" rows={4} value={v.message} onChange={set("message")} />

        {/* Honeypot: hidden from people and assistive tech, bots fill it in. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Leave this empty
            <input tabIndex={-1} autoComplete="off" value={v.hp} onChange={(e) => set("hp")(e.target.value)} />
          </label>
        </div>

        <ActionButton type="submit" variant="primary" loading={sending}>
          {sending ? "Sending..." : "Send message"}
        </ActionButton>
        <p className="text-xs text-text-tertiary">Your details are only used to reply to your message.</p>
      </form>
    </Panel>
  );
}
