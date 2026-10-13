"use client";

import { ActionButton, CheckInput, Loading, Panel, StatusBadge, TextInput } from "@/components/app/kit";
import { apiFetch } from "@/lib/api";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface PaymentStatus {
  mode: "direct" | "connect";
  enabled: boolean;
  livemode: boolean;
  paymentMethods: string[];
}

const DISCONNECTED: PaymentStatus = { mode: "direct", enabled: false, livemode: false, paymentMethods: ["card"] };

const METHOD_LABEL: Record<string, string> = {
  card: "Cards",
  us_bank_account: "US bank account (ACH)",
  link: "Link",
  sepa_debit: "SEPA Direct Debit",
  ideal: "iDEAL",
  bacs_debit: "Bacs Direct Debit",
  klarna: "Klarna",
  afterpay_clearpay: "Afterpay / Clearpay",
  affirm: "Affirm",
  cashapp: "Cash App Pay",
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
  const [available, setAvailable] = useState<{ id: string; active: boolean }[]>([]);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiFetch<PaymentStatus>("/payments/status")
      .then((data) => {
        setStatus(data);
        setSelectedMethods(data.paymentMethods?.length > 0 ? data.paymentMethods : ["card"]);
      })
      .catch(() => setStatus(DISCONNECTED))
      .finally(() => setLoading(false));
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);

  useEffect(() => {
    if (status?.enabled !== true) return;
    apiFetch<{ methods: { id: string; active: boolean }[] }>("/payments/available-methods")
      .then((d) => setAvailable(d.methods))
      .catch(() => {});
  }, [status?.enabled]);

  // Result of the Stripe Connect OAuth round trip.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripe = params.get("stripe");
    const err = params.get("error");
    if (stripe === "connected") {
      toast.success("Stripe account connected successfully");
      apiFetch<PaymentStatus>("/payments/status").then(setStatus);
    } else if (stripe === "cancelled" || err === "access_denied") {
      toast.info("Stripe connection was cancelled. You can try again whenever you're ready.");
    } else if (stripe === "error") {
      toast.error("Something went wrong connecting your Stripe account. Please try again.");
    }
    if (stripe || err) {
      const url = new URL(window.location.href);
      url.searchParams.delete("stripe");
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  async function saveKey() {
    if (!secretKey.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ livemode: boolean }>("/payments/direct/save-key", {
        method: "POST",
        body: JSON.stringify({ stripeSecretKey: secretKey.trim() }),
      });
      setSecretKey("");
      setStatus({ mode: "direct", enabled: true, livemode: res.livemode, paymentMethods: ["card"] });
      toast.success("Stripe key saved. Webhook registered automatically.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save Stripe key");
    } finally {
      setSaving(false);
    }
  }

  async function removeKey() {
    if (!window.confirm("Remove your Stripe key? Clients will no longer be able to pay invoices online.")) return;
    setDisconnecting(true);
    try {
      await apiFetch("/payments/direct/remove-key", { method: "POST" });
      setStatus(DISCONNECTED);
      toast.success("Stripe key removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove key");
    } finally {
      setDisconnecting(false);
    }
  }

  async function connect() {
    setConnecting(true);
    try {
      const res = await apiFetch<{ url: string }>("/payments/connect/authorize", {
        method: "POST",
        body: JSON.stringify({ returnUrl: window.location.href.split("?")[0] }),
      });
      timeout.current = setTimeout(() => {
        setConnecting(false);
        toast.error("Redirect took too long. Please try again.");
      }, 15000);
      window.location.href = res.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start Stripe Connect");
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect your Stripe account? Clients will no longer be able to pay invoices online.")) return;
    setDisconnecting(true);
    try {
      await apiFetch("/payments/connect/disconnect", { method: "POST" });
      setStatus({ ...DISCONNECTED, mode: "connect" });
      toast.success("Stripe account disconnected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  async function saveMethods() {
    setSavingMethods(true);
    try {
      await apiFetch("/payments/payment-methods", { method: "POST", body: JSON.stringify({ paymentMethods: selectedMethods }) });
      toast.success("Payment methods saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save payment methods");
    } finally {
      setSavingMethods(false);
    }
  }

  if (loading || !status) return <Loading />;

  if (status.enabled) {
    return (
      <Panel
        title="Stripe"
        description={status.mode === "connect" ? "Connected via Stripe Connect" : "Connected via API key"}
        action={<StatusBadge color={status.livemode ? "success" : "warning"}>{status.livemode ? "Live mode" : "Test mode"}</StatusBadge>}
      >
        <div className="space-y-5">
          {available.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-text-primary">Payment methods clients can use</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {available.map((m) => (
                  <CheckInput
                    key={m.id}
                    disabled={!m.active || m.id === "card"}
                    checked={selectedMethods.includes(m.id)}
                    onChange={(on) => setSelectedMethods((prev) => (on ? [...prev, m.id] : prev.filter((x) => x !== m.id)))}
                    label={`${METHOD_LABEL[m.id] ?? m.id}${m.active ? "" : " (not active on your Stripe account)"}`}
                  />
                ))}
              </div>
              <ActionButton size="sm" variant="primary" loading={savingMethods} onPress={saveMethods}>
                Save payment methods
              </ActionButton>
            </div>
          )}
          <ActionButton
            appearance="outline"
            variant="danger"
            loading={disconnecting}
            onPress={status.mode === "connect" ? disconnect : removeKey}
          >
            {status.mode === "connect" ? "Disconnect Stripe" : "Remove Stripe key"}
          </ActionButton>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <Panel title="Connect with Stripe" description="One click. Clients pay invoices online and the money goes straight to your Stripe account.">
        <ActionButton variant="primary" loading={connecting} onPress={connect}>
          Connect Stripe
        </ActionButton>
      </Panel>
      <Panel title="Use your own API key" description="Paste a restricted or secret key from your Stripe dashboard. The webhook is registered for you.">
        <div className="max-w-md space-y-3">
          <TextInput label="Stripe secret key" type="password" value={secretKey} onChange={setSecretKey} placeholder="sk_live_… or rk_live_…" />
          <ActionButton variant="primary" loading={saving} isDisabled={!secretKey.trim()} onPress={saveKey}>
            Save key
          </ActionButton>
        </div>
      </Panel>
    </div>
  );
}
