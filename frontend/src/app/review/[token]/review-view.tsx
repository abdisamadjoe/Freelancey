"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle2, ExternalLink, MessageSquareWarning } from "lucide-react";
import { Alert, Badge, Button, Card, Field, Input, Textarea } from "@/components/ui";
import { DELIVERABLE_STATUS_COLOR, DELIVERABLE_STATUS_LABEL, type DeliverableLink } from "@/lib/workflow";

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
      <div className="text-center">
        {d.logoUrl && <Image src={d.logoUrl} alt="" width={56} height={56} unoptimized className="mx-auto mb-3 size-14 rounded-lg object-contain" />}
        <p className="text-sm text-text-tertiary">
          {d.organizationName} · {d.projectName}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-text-primary">{d.title}</h1>
        <div className="mt-2 flex justify-center gap-2">
          <Badge color="gray">Version {d.version}</Badge>
          <Badge color={DELIVERABLE_STATUS_COLOR[d.status] ?? "gray"}>{DELIVERABLE_STATUS_LABEL[d.status] ?? d.status}</Badge>
        </div>
      </div>

      {d.status === "approved" && (
        <Alert status="success" title="Approved">
          Approved by {d.approvedByName}
          {d.approvedAt ? ` on ${new Date(d.approvedAt).toLocaleDateString()}` : ""}. Thank you.
        </Alert>
      )}
      {d.status === "changes_requested" && (
        <Alert status="info" title="Changes requested">
          {d.organizationName} has your feedback and will send a new version.
        </Alert>
      )}

      <Card className="space-y-4 p-6">
        {d.description && <p className="whitespace-pre-wrap text-sm text-text-secondary">{d.description}</p>}
        {d.links.length > 0 && (
          <ul className="space-y-2">
            {d.links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-brand-color hover:underline">
                  <ExternalLink className="size-4" aria-hidden />
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {d.changeRequests.length > 0 && (
        <Card className="space-y-3 p-6">
          <h2 className="text-base font-semibold text-text-primary">Earlier feedback</h2>
          {d.changeRequests.map((c) => (
            <div key={c.createdAt} className="rounded-md border border-card-border px-3 py-2 text-sm">
              <p className="text-xs text-text-tertiary">
                On version {c.version} · {new Date(c.createdAt).toLocaleDateString()}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-text-primary">{c.message}</p>
            </div>
          ))}
        </Card>
      )}

      {reviewing && (
        <Card className="space-y-4 p-6">
          {error && <Alert status="error">{error}</Alert>}
          {mode === "idle" ? (
            <>
              <Field label="Type your full name to approve" htmlFor="rv-name">
                <Input id="rv-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} autoComplete="name" />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button iconOnly={false} loading={busy} disabled={!name.trim()} onClick={() => answer("approve", { name })}>
                  <CheckCircle2 />
                  <span>Approve</span>
                </Button>
                <Button appearance="outline" iconOnly={false} onClick={() => setMode("changes")}>
                  <MessageSquareWarning />
                  <span>Request changes</span>
                </Button>
              </div>
            </>
          ) : (
            <>
              <Field label="What should change?" htmlFor="rv-msg" required>
                <Textarea id="rv-msg" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={3000} placeholder="e.g. Please change the hero section" />
              </Field>
              <div className="flex gap-2">
                <Button loading={busy} disabled={!message.trim()} onClick={() => answer("request-changes", { message })}>
                  Send feedback
                </Button>
                <Button appearance="outline" onClick={() => setMode("idle")}>
                  Back
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
