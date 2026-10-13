"use client";

import { ActionButton, Loading, Notice, Panel, SelectInput, TextInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const PROVIDERS = [
  { value: "cloudflare", label: "Cloudflare" },
  { value: "route53", label: "AWS Route 53" },
  { value: "godaddy", label: "GoDaddy" },
  { value: "namecheap", label: "Namecheap" },
  { value: "porkbun", label: "Porkbun" },
  { value: "google", label: "Google / Squarespace" },
  { value: "other", label: "Other" },
] as const;

function steps(provider: string, domain: string, target: string): { warning?: string; steps: string[] } {
  switch (provider) {
    case "cloudflare":
      return {
        warning: 'Set "Proxy status" to DNS only (grey cloud icon). Proxied mode will break SSL provisioning.',
        steps: [
          "Open the Cloudflare dashboard and select your domain.",
          "Go to DNS → Records → Add record.",
          `Add: Type: CNAME  |  Name: ${domain}  |  Value: ${target}`,
          "Set Proxy status to DNS only (grey cloud).",
          "Click Save.",
        ],
      };
    case "route53":
      return {
        steps: [
          "Open the AWS Console → Route 53 → Hosted zones.",
          "Select your hosted zone and click Create record.",
          "Set Record type to CNAME.",
          `Set Record name to the subdomain (e.g. portal) and Value to: ${target}`,
          "Leave TTL as default. Click Create records.",
        ],
      };
    case "godaddy":
      return {
        steps: [
          "Log in to GoDaddy → My Products → your domain → DNS.",
          "Click Add New Record → Type: CNAME.",
          `Set Name to the subdomain (e.g. portal) and Value to: ${target}`,
          "Click Save.",
        ],
      };
    case "namecheap":
      return {
        steps: [
          "Log in to Namecheap → Domain List → Manage → Advanced DNS.",
          "Click Add New Record → CNAME Record.",
          `Set Host to the subdomain (e.g. portal) and Value to: ${target}`,
          "Click the checkmark to save.",
        ],
      };
    case "porkbun":
      return {
        steps: [
          "Log in to Porkbun → click DNS on your domain.",
          "Set Type to CNAME, Host to the subdomain (e.g. portal).",
          `Set Answer to: ${target}`,
          "Click Add.",
        ],
      };
    case "google":
      return {
        steps: [
          "Open Squarespace Domains → your domain → DNS → Custom Records.",
          "Set Host to the subdomain (e.g. portal), Type to CNAME.",
          `Set Data to: ${target}`,
          "Click Add Record.",
        ],
      };
    default:
      return {
        steps: [
          "Log in to your DNS provider and find DNS management.",
          `Add a CNAME record: Name = ${domain}, Value = ${target}`,
          "Save the record. DNS changes can take up to 48 hours to propagate.",
        ],
      };
  }
}

export function CustomDomainSection() {
  const [loading, setLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [savedDomain, setSavedDomain] = useState<string | null>(null);
  const [domain, setDomain] = useState("");
  const [provider, setProvider] = useState("cloudflare");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [verify, setVerify] = useState<null | "checking" | { verified: boolean; reason?: string }>(null);

  const target = typeof window !== "undefined" ? window.location.hostname : "";

  useEffect(() => {
    Promise.all([
      apiFetch<{ subscription: { plan: { slug: string } } | null }>("/billing/subscription").catch(() => null),
      apiFetch<{ customDomain: string | null }>("/settings/custom-domain").catch(() => null),
    ]).then(([sub, data]) => {
      setIsPaid(!sub || sub.subscription?.plan?.slug !== "free");
      if (data?.customDomain) {
        setSavedDomain(data.customDomain);
        setDomain(data.customDomain);
      }
      setLoading(false);
    });
  }, []);

  async function save() {
    if (!domain.trim()) return;
    setSaving(true);
    setDomainError(null);
    setVerify(null);
    try {
      const result = await apiFetch<{ customDomain: string | null }>("/settings/custom-domain", {
        method: "PUT",
        body: JSON.stringify({ domain: domain.trim() }),
      });
      setSavedDomain(result.customDomain);
      toast.success("Custom domain saved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save domain";
      if (message.toLowerCase().includes("already in use")) setDomainError(message);
      else toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setRemoving(true);
    setDomainError(null);
    setVerify(null);
    try {
      await apiFetch("/settings/custom-domain", { method: "DELETE" });
      setSavedDomain(null);
      setDomain("");
      toast.success("Custom domain removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove domain");
    } finally {
      setRemoving(false);
    }
  }

  async function runVerify() {
    setVerify("checking");
    try {
      setVerify(await apiFetch<{ verified: boolean; reason?: string }>("/settings/custom-domain/verify"));
    } catch {
      setVerify({ verified: false, reason: "Verification request failed" });
    }
  }

  if (loading) return <Loading />;

  if (!isPaid) {
    return (
      <Panel title="Custom domain" description="Host your client portal at your own domain.">
        <Notice status="info">
          Custom domains are a Pro feature.{" "}
          <a className="font-medium underline" href="/dashboard/settings/billing?reason=custom-domain">
            Upgrade
          </a>
        </Notice>
      </Panel>
    );
  }

  const instructions = savedDomain ? steps(provider, savedDomain, target) : null;

  return (
    <Panel title="Custom domain" description="Host your client portal at your own domain, e.g. portal.yourcompany.com.">
      <div className="space-y-4">
        <div className="max-w-md space-y-3">
          <TextInput label="Domain" placeholder="portal.yourcompany.com" value={domain} onChange={(v) => { setDomain(v); setDomainError(null); }} />
          {domainError && <p className="text-xs text-error-500">{domainError}</p>}
          <div className="flex gap-2">
            <ActionButton variant="primary" loading={saving} isDisabled={!domain.trim()} onPress={save}>
              Save domain
            </ActionButton>
            {savedDomain && (
              <ActionButton variant="danger" appearance="outline" loading={removing} onPress={remove}>
                Remove
              </ActionButton>
            )}
          </div>
        </div>

        {savedDomain && instructions && (
          <div className="space-y-4 border-t border-card-border pt-4">
            <div className="rounded-lg border border-card-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-background-gray-secondary_alt text-xs text-text-secondary">
                  <tr>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2">CNAME</td>
                    <td className="px-4 py-2">{savedDomain}</td>
                    <td className="px-4 py-2">{target}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ActionButton appearance="outline" variant="primary" loading={verify === "checking"} onPress={runVerify}>
                {verify === "checking" ? "Checking DNS…" : "Verify DNS"}
              </ActionButton>
              {verify && verify !== "checking" && (
                <span className={verify.verified ? "text-sm text-success-500" : "text-sm text-text-tertiary"}>
                  {verify.verified ? "DNS verified" : verify.reason}
                </span>
              )}
              <Button size="xs" variant="ghost" onPress={() => navigator.clipboard.writeText(target).then(() => toast.success("Copied"))}>
                Copy target
              </Button>
            </div>

            <div className="max-w-xs">
              <SelectInput label="DNS provider" value={provider} onChange={setProvider} options={PROVIDERS} />
            </div>
            {instructions.warning && <Notice status="warning">{instructions.warning}</Notice>}
            <ol className="list-decimal space-y-1 pl-5 text-sm text-text-secondary">
              {instructions.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Panel>
  );
}
