"use client";

import { useEffect, useState, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { ExternalLink, Unlink, Key, ChevronDown } from "lucide-react";
import {
  Button,
  Checkbox,
  Field,
  Input,
  Skeleton,
  StatusBadge,
} from "@/components/ui";

interface PaymentStatus {
  mode: "direct" | "connect";
  enabled: boolean;
  livemode: boolean;
  paymentMethods: string[];
}

const DISCONNECTED: PaymentStatus = { mode: "direct", enabled: false, livemode: false, paymentMethods: ["card"] };

const METHOD_META: Record<string, { label: string; description: string; fee: string; bnpl?: boolean }> = {
  card:              { label: "Card",               description: "Visa, Mastercard, Amex, Apple Pay, Google Pay", fee: "2.9% + 30¢" },
  us_bank_account:   { label: "ACH bank transfer",  description: "US bank accounts (USD only)",             fee: "0.8%, max $5" },
  link:              { label: "Link",               description: "Stripe's one-click checkout (req. Card)",  fee: "2.9% + 30¢" },
  sepa_debit:        { label: "SEPA Direct Debit",  description: "European bank accounts (EUR only)",       fee: "0.8%, max €5" },
  ideal:             { label: "iDEAL",              description: "Dutch bank transfers (Netherlands only)",  fee: "80¢ flat" },
  bacs_debit:        { label: "Bacs Direct Debit",  description: "UK bank accounts (GBP only)",            fee: "1%, max £2" },
  klarna:            { label: "Klarna",             description: "Pay in installments",                     fee: "~3.29% + 30¢", bnpl: true },
  afterpay_clearpay: { label: "Afterpay / Clearpay",description: "Pay in 4 installments",                  fee: "~6% + 30¢",    bnpl: true },
  affirm:            { label: "Affirm",             description: "Pay over time",                           fee: "~6% + 30¢",    bnpl: true },
  cashapp:           { label: "Cash App Pay",       description: "Cash App mobile payments",               fee: "2.9% + 30¢" },
};

export function PaymentsSection() {
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [selectedMethods, setSelectedMethods] = useState<string[]>(["card"]);
  const [savingMethods, setSavingMethods] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<{ id: string; active: boolean }[]>([]);
  const [showMethods, setShowMethods] = useState(false);
  const { success, error: showError, info } = useToast();
  const connectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiFetch<PaymentStatus>("/payments/status")
      .then((data) => {
        setStatus(data);
        setSelectedMethods(data.paymentMethods?.length > 0 ? data.paymentMethods : ["card"]);
      })
      .catch(() => setStatus(DISCONNECTED))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      if (connectTimeout.current) clearTimeout(connectTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (status?.enabled !== true) return;
    apiFetch<{ methods: { id: string; active: boolean }[] }>("/payments/available-methods")
      .then((data) => setAvailableMethods(data.methods))
      .catch(() => {});
  }, [status?.enabled]);

  // Handle OAuth redirect results (Connect mode)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeParam = params.get("stripe");
    const errorParam = params.get("error");

    if (stripeParam === "connected") {
      success("Stripe account connected successfully");
      apiFetch<PaymentStatus>("/payments/status").then(setStatus);
    } else if (stripeParam === "cancelled" || errorParam === "access_denied") {
      info("Stripe connection was cancelled. You can try again whenever you're ready.");
    } else if (stripeParam === "error") {
      showError("Something went wrong connecting your Stripe account. Please try again.");
    }

    if (stripeParam || errorParam) {
      const url = new URL(window.location.href);
      url.searchParams.delete("stripe");
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Direct Keys handlers ──

  const handleSaveKey = async () => {
    if (!secretKey.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ livemode: boolean }>(
        "/payments/direct/save-key",
        {
          method: "POST",
          body: JSON.stringify({ stripeSecretKey: secretKey.trim() }),
        },
      );
      setSecretKey("");
      setStatus({ mode: "direct", enabled: true, livemode: res.livemode, paymentMethods: ["card"] });
      success("Stripe key saved. Webhook registered automatically.");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save Stripe key");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKey = async () => {
    if (!confirm("Remove your Stripe key? Clients will no longer be able to pay invoices online.")) {
      return;
    }
    setDisconnecting(true);
    try {
      await apiFetch("/payments/direct/remove-key", { method: "POST" });
      setStatus(DISCONNECTED);
      success("Stripe key removed");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to remove key");
    } finally {
      setDisconnecting(false);
    }
  };

  // ── Connect OAuth handlers ──

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const returnUrl = window.location.href.split("?")[0];
      const res = await apiFetch<{ url: string }>("/payments/connect/authorize", {
        method: "POST",
        body: JSON.stringify({ returnUrl }),
      });
      connectTimeout.current = setTimeout(() => {
        setConnecting(false);
        showError("Redirect took too long. Please try again.");
      }, 15000);
      window.location.href = res.url;
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to start Stripe Connect");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect your Stripe account? Clients will no longer be able to pay invoices online.")) {
      return;
    }
    setDisconnecting(true);
    try {
      await apiFetch("/payments/connect/disconnect", { method: "POST" });
      setStatus({ ...DISCONNECTED, mode: "connect" });
      success("Stripe account disconnected");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSavePaymentMethods = async () => {
    setSavingMethods(true);
    try {
      await apiFetch("/payments/payment-methods", {
        method: "POST",
        body: JSON.stringify({ paymentMethods: selectedMethods }),
      });
      success("Payment methods saved");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save payment methods");
    } finally {
      setSavingMethods(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-full max-w-xl rounded-lg" />
        <Skeleton className="h-10 w-full max-w-xl rounded-lg" />
      </div>
    );
  }

  // ── Connected state (either mode) ──
  if (status?.enabled) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-success-500" aria-hidden />
            <span className="text-sm font-medium text-text-primary">Connected</span>
          </span>
          <span className="text-xs text-text-tertiary">
            {status.mode === "connect" ? "via Stripe Connect" : "via API key"}
          </span>
          <StatusBadge
            className="ml-auto"
            status={status.livemode ? "active" : "pending"}
            label={status.livemode ? "Live" : "Test mode"}
          />
        </div>

        {!status.livemode && (
          <p className="text-xs leading-5 text-warning-500">
            Clients cannot submit real payments in test mode. Use a live Stripe key to accept real payments.
          </p>
        )}

        <p className="text-xs leading-5 text-text-tertiary">
          Clients can pay invoices directly from the portal. Payments go to your Stripe account.
        </p>

        <div className="border-t border-card-border pt-4">
          <button
            type="button"
            onClick={() => setShowMethods((v) => !v)}
            className="flex w-full items-center justify-between gap-3 text-sm font-medium text-text-primary"
          >
            <span>Accepted payment methods</span>
            <ChevronDown
              className={`size-4 text-icon-tertiary transition-transform ${showMethods ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>

          {showMethods && (
            <div className="mt-3 space-y-3">
              {availableMethods.length === 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between border-b border-card-border px-1 pb-1">
                    <span className="text-xs text-text-tertiary">Method</span>
                    <span className="text-xs text-text-tertiary">Stripe fee</span>
                  </div>
                  {availableMethods.map((m) => {
                    const meta = METHOD_META[m.id];
                    if (!meta) return null;
                    // Can't uncheck the last selected method
                    const isLastSelected = selectedMethods.includes(m.id) && selectedMethods.length === 1;
                    const disabled = !m.active || isLastSelected;
                    return (
                      <label key={m.id} className={`flex items-start gap-3 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
                        <span className="pt-0.5">
                          <Checkbox
                            checked={selectedMethods.includes(m.id)}
                            disabled={disabled}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedMethods((prev) => [...prev, m.id]);
                              else setSelectedMethods((prev) => prev.filter((x) => x !== m.id));
                            }}
                          />
                        </span>
                        <span className="flex-1">
                          <span className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-text-primary">{meta.label}</span>
                            <span className="font-mono text-xs text-text-tertiary">{meta.fee}</span>
                          </span>
                          <span className="block text-xs leading-5 text-text-tertiary">{meta.description}</span>
                          {!m.active && (
                            <span className="mt-0.5 block text-xs leading-5 text-text-tertiary">
                              {meta.bnpl ? (
                                <>Enable in your{" "}
                                  <a
                                    href="https://dashboard.stripe.com/settings/payment_methods"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Stripe dashboard
                                  </a>
                                  {" "}to use this</>
                              ) : (
                                <span className="group/tip relative inline-block">
                                  Not available for your Stripe account
                                  <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-1.5 w-56 rounded-md bg-text-primary px-2.5 py-1.5 text-xs text-background-white-primary opacity-0 shadow-md transition-opacity group-hover/tip:opacity-100">
                                    You may be able to enable this in your{" "}
                                    <a
                                      href="https://dashboard.stripe.com/settings/payment_methods"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="pointer-events-auto underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Stripe dashboard
                                    </a>
                                    {" "}based on your account's country and capabilities.
                                  </span>
                                </span>
                              )}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSavePaymentMethods}
                    disabled={savingMethods}
                    loading={savingMethods}
                  >
                    {savingMethods ? "Saving..." : "Save methods"}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="danger"
          appearance="outline"
          onClick={status.mode === "connect" ? handleDisconnect : handleRemoveKey}
          disabled={disconnecting}
          loading={disconnecting}
        >
          <Unlink aria-hidden />
          {disconnecting
            ? "Disconnecting..."
            : status.mode === "connect"
              ? "Disconnect Stripe"
              : "Remove Stripe Key"}
        </Button>
      </div>
    );
  }

  // ── Not connected: Connect mode ──
  if (status?.mode === "connect") {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-5 text-text-tertiary">
          Connect your Stripe account to let clients pay invoices directly from the portal.
        </p>
        <Button type="button" onClick={handleConnect} disabled={connecting} loading={connecting}>
          <ExternalLink aria-hidden />
          {connecting ? "Redirecting..." : "Connect with Stripe"}
        </Button>
      </div>
    );
  }

  // ── Not connected: Direct keys mode ──
  return (
    <div className="space-y-4">
      <p className="text-sm leading-5 text-text-tertiary">
        Enter your Stripe secret key to let clients pay invoices directly from the portal.
        Your key is stored encrypted and never displayed again.
      </p>
      <Field
        htmlFor="stripe-secret-key"
        description={
          <>
            Find your key at{" "}
            <a
              href="https://dashboard.stripe.com/apikeys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-brand-color underline-offset-2 hover:underline"
            >
              dashboard.stripe.com/apikeys
            </a>
          </>
        }
      >
        <Input
          id="stripe-secret-key"
          type="password"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          placeholder="sk_test_... or sk_live_..."
          className="max-w-xl font-mono"
        />
      </Field>
      <Button
        type="button"
        onClick={handleSaveKey}
        disabled={saving || !secretKey.trim()}
        loading={saving}
      >
        <Key aria-hidden />
        {saving ? "Connecting..." : "Save & Connect"}
      </Button>
    </div>
  );
}
