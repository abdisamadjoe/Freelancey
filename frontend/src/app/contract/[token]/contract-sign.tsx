"use client";

import { useState } from "react";
import { Download, PenLine } from "lucide-react";
import type { ContractContent } from "@/shared";
import { Alert, Badge, Button, Card, Checkbox, Field, Input } from "@/components/ui";
import { ContractPreview } from "@/components/contracts/contract-preview";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export interface PublicContract {
  organizationName: string;
  primaryColor: string | null;
  logoUrl: string | null;
  clientName: string;
  title: string;
  version: number;
  status: string;
  signedAt: string | null;
  signedByName: string | null;
  content: ContractContent;
}

export function ContractSign({ token, initial }: { token: string; initial: PublicContract }) {
  const [contract, setContract] = useState(initial);
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const signed = contract.status === "signed";
  const base = `${API_URL}/api/contracts/public/${encodeURIComponent(token)}`;

  async function sign() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${base}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, consent }),
      });
      if (res.status === 429) throw new Error("Too many attempts. Please try again in a minute.");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(message || "Something went wrong. Please try again.");
      }
      const fresh = await fetch(base, { cache: "no-store" });
      if (fresh.ok) setContract((await fresh.json()) as PublicContract);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-text-tertiary">Contract from {contract.organizationName}</p>
          <h1 className="text-2xl font-semibold text-text-primary">{contract.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge color={signed ? "success" : "blue"}>{signed ? "Signed" : "Awaiting your signature"}</Badge>
          <a
            href={`${base}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-card-border px-3 text-sm text-text-primary hover:bg-background-gray-secondary"
          >
            <Download className="size-4" aria-hidden />
            PDF
          </a>
        </div>
      </div>

      {signed && (
        <Alert status="success" title="Signed">
          Signed by {contract.signedByName}
          {contract.signedAt ? ` on ${new Date(contract.signedAt).toLocaleString()}` : ""}. {contract.organizationName} has been notified and will be in touch about the next steps.
        </Alert>
      )}

      <ContractPreview
        content={contract.content}
        status={contract.status.toUpperCase()}
        version={contract.version}
        brandingColor={contract.primaryColor ?? undefined}
        orgName={contract.organizationName}
      />

      {!signed && (
        <Card className="space-y-4 p-6">
          {error && <Alert status="error">{error}</Alert>}
          <Field label="Type your full name to sign" htmlFor="sign-name" required>
            <Input id="sign-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} autoComplete="name" />
          </Field>
          <label className="flex items-start gap-3 text-sm text-text-secondary">
            <Checkbox checked={consent} onChange={() => setConsent((v) => !v)} aria-label="I agree to be bound by this contract" />
            <span>I have read this contract and agree to be legally bound by it. Typing my name is my electronic signature.</span>
          </label>
          <Button iconOnly={false} loading={busy} disabled={!name.trim() || !consent} onClick={sign}>
            <PenLine />
            <span>Sign contract</span>
          </Button>
        </Card>
      )}
    </div>
  );
}
