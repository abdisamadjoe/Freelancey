"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, RefreshCw, Sparkles, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import {
  Alert,
  Badge,
  Button,
  buttonStyles,
  Card,
  Input,
  NativeSelect,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/ui";
import { cn } from "@/lib/utils";

interface Subscription {
  subscription: { plan: { slug: string } } | null;
}

interface CustomDomainData {
  customDomain: string | null;
}

// The admin is always on the main domain when in settings, so we can use
// window.location.hostname as the CNAME target rather than a build-time env var.
const MAIN_DOMAIN = typeof window !== "undefined" ? window.location.hostname : "";

// DNS provider metadata
const PROVIDERS = [
  { id: "cloudflare", label: "Cloudflare" },
  { id: "route53", label: "AWS Route 53" },
  { id: "godaddy", label: "GoDaddy" },
  { id: "namecheap", label: "Namecheap" },
  { id: "porkbun", label: "Porkbun" },
  { id: "google", label: "Google / Squarespace" },
  { id: "other", label: "Other" },
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];

interface ProviderInstructions {
  note?: string;
  warning?: string;
  steps: string[];
}

function getInstructions(provider: ProviderId, domain: string, target: string): ProviderInstructions {
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
        note: "Google Domains was acquired by Squarespace. The DNS interface is the same.",
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

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button
      type="button"
      appearance="ghost"
      size="xs"
      iconOnly
      title="Copy"
      onClick={copy}
      className="text-icon-tertiary"
    >
      {copied ? <Check className="text-green-600" /> : <Copy />}
    </Button>
  );
}

function DnsTable({ domain, target }: { domain: string; target: string }) {
  return (
    <div className="overflow-hidden rounded-lg border-[0.5px] border-card-border">
      <TableRoot className="font-mono text-xs">
        <TableHeader className="bg-background-gray-secondary_alt">
          <TableRow>
            <TableHead className="w-20 text-xs font-semibold text-text-secondary">Field</TableHead>
            <TableHead className="text-xs font-semibold text-text-secondary">Value</TableHead>
            <TableHead className="w-12 text-xs font-semibold text-text-secondary">
              <span className="sr-only">Copy</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="text-text-tertiary">Type</TableCell>
            <TableCell>CNAME</TableCell>
            <TableCell />
          </TableRow>
          <TableRow>
            <TableCell className="text-text-tertiary">Name</TableCell>
            <TableCell className="max-w-0 truncate">{domain}</TableCell>
            <TableCell className="text-right">
              <CopyButton value={domain} />
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="text-text-tertiary">Value</TableCell>
            <TableCell className="max-w-0 truncate">{target}</TableCell>
            <TableCell className="text-right">
              <CopyButton value={target} />
            </TableCell>
          </TableRow>
        </TableBody>
      </TableRoot>
    </div>
  );
}

export function CustomDomainSection() {
  const [isPaid, setIsPaid] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [domain, setDomain] = useState("");
  const [savedDomain, setSavedDomain] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderId>("cloudflare");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<null | "checking" | { verified: boolean; reason?: string }>(null);
  const { success, error: showError } = useToast();

  useEffect(() => {
    Promise.all([
      apiFetch<Subscription>("/billing/subscription").catch(() => null),
      apiFetch<CustomDomainData>("/settings/custom-domain").catch(() => null),
    ]).then(([sub, domainData]) => {
      setIsPaid(!sub || sub.subscription?.plan?.slug !== "free");
      if (domainData?.customDomain) {
        setSavedDomain(domainData.customDomain);
        setDomain(domainData.customDomain);
      }
      setLoadingPlan(false);
    });
  }, []);

  const handleSave = async () => {
    if (!domain.trim()) return;
    setSaving(true);
    setDomainError(null);
    setVerifyStatus(null);
    try {
      const result = await apiFetch<CustomDomainData>("/settings/custom-domain", {
        method: "PUT",
        body: JSON.stringify({ domain: domain.trim() }),
      });
      setSavedDomain(result.customDomain);
      success("Custom domain saved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save domain";
      // Show conflict inline rather than as a toast so it's easier to act on
      if (message.toLowerCase().includes("already in use")) {
        setDomainError(message);
      } else {
        showError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    setDomainError(null);
    setVerifyStatus(null);
    try {
      await apiFetch("/settings/custom-domain", { method: "DELETE" });
      setSavedDomain(null);
      setDomain("");
      success("Custom domain removed");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to remove domain");
    } finally {
      setRemoving(false);
    }
  };

  const handleVerify = async () => {
    setVerifyStatus("checking");
    try {
      const result = await apiFetch<{ verified: boolean; reason?: string }>("/settings/custom-domain/verify");
      setVerifyStatus(result);
    } catch {
      setVerifyStatus({ verified: false, reason: "Verification request failed" });
    }
  };

  if (loadingPlan) return null;

  // Free plan — premium feature gate
  if (!isPaid) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1">
          <Input
            type="text"
            placeholder="portal.yourcompany.com"
            disabled
            className="cursor-not-allowed pr-16 select-none"
          />
          <span className="absolute top-1/2 right-2.5 -translate-y-1/2">
            <Badge color="warning">
              <Sparkles aria-hidden />
              PRO
            </Badge>
          </span>
        </div>
        <a
          href="/dashboard/settings/account?reason=custom-domain#billing"
          className={cn(buttonStyles({ variant: "primary", size: "md" }), "whitespace-nowrap")}
        >
          Upgrade to Pro
        </a>
      </div>
    );
  }

  const instructions = savedDomain
    ? getInstructions(provider, savedDomain, MAIN_DOMAIN)
    : null;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-start gap-2">
          <Input
            type="text"
            placeholder="portal.yourcompany.com"
            value={domain}
            onChange={(e) => { setDomain(e.target.value); setDomainError(null); }}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            invalid={Boolean(domainError)}
            className="min-w-60 flex-1"
          />
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !domain.trim() || domain.trim() === savedDomain}
            loading={saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
          {savedDomain && (
            <Button
              type="button"
              variant="danger"
              appearance="outline"
              iconOnly
              title="Remove custom domain"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing ? "…" : <X aria-hidden />}
            </Button>
          )}
        </div>
        {domainError && (
          <p role="alert" className="text-xs text-red-600">{domainError}</p>
        )}
      </div>

      {savedDomain && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            appearance="outline"
            variant="primary"
            size="sm"
            onClick={handleVerify}
            disabled={verifyStatus === "checking"}
          >
            <RefreshCw className={verifyStatus === "checking" ? "animate-spin" : undefined} aria-hidden />
            {verifyStatus === "checking" ? "Checking DNS…" : "Verify DNS"}
          </Button>
          {verifyStatus && verifyStatus !== "checking" && (
            <span
              className={cn(
                "flex items-center gap-1 text-xs",
                verifyStatus.verified ? "text-green-600" : "text-text-tertiary",
              )}
            >
              {verifyStatus.verified
                ? <><Check className="size-3" aria-hidden /> DNS verified</>
                : <>{verifyStatus.reason}</>}
            </span>
          )}
        </div>
      )}

      {savedDomain && (
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border bg-background-gray-secondary_alt px-5 py-3">
            <p className="text-xs font-medium text-text-primary">DNS Setup</p>
            <NativeSelect
              value={provider}
              onChange={(e) => setProvider(e.target.value as ProviderId)}
              className="h-8 w-44 py-0 text-xs"
              aria-label="DNS provider"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-4 p-5">
            <DnsTable domain={savedDomain} target={MAIN_DOMAIN} />

            {instructions?.warning && (
              <Alert status="warning">{instructions.warning}</Alert>
            )}

            {instructions?.note && (
              <p className="text-xs leading-5 text-text-tertiary">{instructions.note}</p>
            )}

            <ol className="space-y-1.5">
              {instructions?.steps.map((step, i) => (
                <li key={i} className="flex gap-2.5 text-xs leading-5 text-text-tertiary">
                  <span className="mt-0.5 w-3 shrink-0 font-mono text-[10px]">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <p className="border-t border-card-border pt-4 text-xs leading-5 text-text-tertiary">
              SSL is provisioned automatically on first visit. DNS changes can take up to 48 hours.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
