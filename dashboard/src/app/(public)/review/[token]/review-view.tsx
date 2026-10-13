"use client";

import { PublicHeader } from "@/components/app/public";
import { ActionButton, fmtDate, Notice, Panel, StatusBadge, TextAreaInput, TextInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { DELIVERABLE_STATUS_COLOR, DELIVERABLE_STATUS_LABEL, type DeliverableLink } from "@/lib/workflow";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface PublicDeliverable {
  organizationName: string;
  primaryColor: string | null;
  logoUrl: string | null;
  projectName: string;
  title: string;
  description: string | null;
  links: DeliverableLink[];
  version: number;
  status: string;
  approvedAt: string | null;
  approvedByName: string | null;
  changeRequests: { version: number; message: string; createdAt: string; status: string }[];
}

export function ReviewView({ token, initial }: { token: string; initial: PublicDeliverable }) {
  const [d, setD] = useState(initial);
  const [mode, setMode] = useState<"idle" | "changes">("idle");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const base = `${API_URL}/api/deliverables/public/${encodeURIComponent(token)}`;
  const reviewing = d.status === "in_review";

  async function answer(path: "approve" | "request-changes", body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${base}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.status === 429) throw new Error("Too many attempts. Please try again in a minute.");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const text = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(text || "Something went wrong. Please try again.");
      }
      const fresh = await fetch(base, { cache: "no-store" });
      if (fresh.ok) setD((await fresh.json()) as PublicDeliverable);
      setMode("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <PublicHeader logoUrl={d.logoUrl} eyebrow={`${d.organizationName} · ${d.projectName}`} title={d.title}>
        <StatusBadge color="gray">Version {d.version}</StatusBadge>
        <StatusBadge color={DELIVERABLE_STATUS_COLOR[d.status] ?? "gray"}>{DELIVERABLE_STATUS_LABEL[d.status] ?? d.status}</StatusBadge>
      </PublicHeader>

      {d.status === "approved" && (
        <Notice status="success">
          Approved by {d.approvedByName}
          {d.approvedAt ? ` on ${fmtDate(d.approvedAt)}` : ""}. Thank you.
        </Notice>
      )}
      {d.status === "changes_requested" && <Notice status="info">{d.organizationName} has your feedback and will send a new version.</Notice>}

      <Panel>
        <div className="space-y-3">
          {d.description && <p className="text-sm whitespace-pre-wrap text-text-secondary">{d.description}</p>}
          {d.links.length > 0 && (
            <ul className="space-y-1.5">
              {d.links.map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noreferrer noopener" className="text-sm font-medium text-neutral-brand-color hover:underline">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      {d.changeRequests.length > 0 && (
        <Panel title="Earlier feedback">
          <div className="space-y-3">
            {d.changeRequests.map((c) => (
              <div key={c.createdAt} className="rounded-md border border-card-border p-3">
                <p className="text-xs text-text-tertiary">
                  On version {c.version} · {fmtDate(c.createdAt)}
                </p>
                <p className="mt-1 text-sm whitespace-pre-wrap text-text-primary">{c.message}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {reviewing && (
        <Panel>
          <div className="space-y-4">
            {error && <Notice status="error">{error}</Notice>}
            {mode === "idle" ? (
              <>
                <TextInput label="Type your full name to approve" value={name} onChange={setName} autoComplete="name" />
                <div className="flex flex-wrap gap-2">
                  <ActionButton variant="primary" loading={busy} isDisabled={!name.trim()} onPress={() => answer("approve", { name })}>
                    Approve
                  </ActionButton>
                  <Button appearance="outline" variant="primary" onPress={() => setMode("changes")}>
                    Request changes
                  </Button>
                </div>
              </>
            ) : (
              <>
                <TextAreaInput label="What should change?" required rows={4} value={message} onChange={setMessage} placeholder="e.g. Please change the hero image" />
                <div className="flex flex-wrap gap-2">
                  <ActionButton variant="primary" loading={busy} isDisabled={!message.trim()} onPress={() => answer("request-changes", { message })}>
                    Send feedback
                  </ActionButton>
                  <Button appearance="outline" variant="primary" onPress={() => setMode("idle")}>
                    Back
                  </Button>
                </div>
              </>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
