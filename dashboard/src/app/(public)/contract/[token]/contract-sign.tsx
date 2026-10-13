"use client";

import { ContractPreview } from "@/components/app/contracts/contract-preview";
import { PublicHeader } from "@/components/app/public";
import { ActionButton, CheckInput, fmtDateTime, Notice, Panel, StatusBadge, TextInput } from "@/components/app/kit";
import type { ContractContent } from "@/shared";
import { useState } from "react";

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
      <PublicHeader logoUrl={contract.logoUrl} eyebrow={`Contract from ${contract.organizationName}`} title={contract.title}>
        <StatusBadge color={signed ? "success" : "blue"}>{signed ? "Signed" : "Awaiting your signature"}</StatusBadge>
        <a href={`${base}/pdf`} target="_blank" rel="noreferrer" className="text-sm font-medium text-neutral-brand-color hover:underline">
          Download PDF
        </a>
      </PublicHeader>

      {signed && (
        <Notice status="success">
          Signed by {contract.signedByName}
          {contract.signedAt ? ` on ${fmtDateTime(contract.signedAt)}` : ""}. {contract.organizationName} has been notified and will be in touch about next steps.
        </Notice>
      )}

      <ContractPreview content={contract.content} status={contract.status.toUpperCase()} version={contract.version} orgName={contract.organizationName} />

      {!signed && (
        <Panel>
          <div className="space-y-4">
            {error && <Notice status="error">{error}</Notice>}
            <TextInput label="Type your full name to sign" required value={name} onChange={setName} autoComplete="name" />
            <CheckInput
              checked={consent}
              onChange={setConsent}
              label="I have read this contract and agree to be legally bound by it. Typing my name is my electronic signature."
            />
            <ActionButton variant="primary" loading={busy} isDisabled={!name.trim() || !consent} onPress={sign}>
              Sign contract
            </ActionButton>
          </div>
        </Panel>
      )}
    </div>
  );
}
