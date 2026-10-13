"use client";

import { ActionButton, FormGrid, Notice, Panel, SelectInput, TextAreaInput, TextInput } from "@/components/app/kit";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const INITIAL = { subject: "", message: "", projectId: "", name: "", email: "", hp: "" };

export function SupportForm({ token, projects }: { token: string; projects: { id: string; name: string }[] }) {
  const [v, setV] = useState(INITIAL);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: keyof typeof INITIAL) => (val: string) => setV((prev) => ({ ...prev, [key]: val }));

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

  if (done) return <Panel title="Request sent" description="We have your message and will reply as soon as we can." />;

  return (
    <Panel>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Notice status="error">{error}</Notice>}
        {projects.length > 0 && (
          <SelectInput
            label="Which project?"
            value={v.projectId}
            onChange={set("projectId")}
            options={[{ value: "", label: "Not sure" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
          />
        )}
        <TextInput label="Subject" required value={v.subject} onChange={set("subject")} />
        <TextAreaInput label="What is happening?" required rows={5} value={v.message} onChange={set("message")} />
        <FormGrid>
          <TextInput label="Your name" value={v.name} onChange={set("name")} autoComplete="name" />
          <TextInput label="Email for the reply" type="email" value={v.email} onChange={set("email")} autoComplete="email" />
        </FormGrid>
        {/* Honeypot: hidden from people, filled by bots. */}
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="s-hp">Leave this empty</label>
          <input id="s-hp" tabIndex={-1} autoComplete="off" value={v.hp} onChange={(e) => set("hp")(e.target.value)} />
        </div>
        <ActionButton type="submit" variant="primary" loading={sending} isDisabled={!v.subject.trim() || !v.message.trim()}>
          Send request
        </ActionButton>
      </form>
    </Panel>
  );
}
