"use client";

import { ActionButton, Loading, Notice, Panel, StatusBadge, StatusPill, fmtDate } from "@/components/app/kit";
import { Progress } from "@/components/tailgrids/core/progress";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { cn } from "@/utils/cn";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  priceLifetime: number;
  maxProjects: number;
  maxStorageMb: number;
  maxMembers: number;
  maxClients: number;
  maxSeats: number;
  isRecurring: boolean;
  features: string[];
  description: string;
}

interface Subscription {
  id: string;
  planId: string;
  status: string;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  plan: Plan;
}

interface Usage {
  projects: number;
  storageMb: number;
  members: number;
  clients: number;
}

const limit = (v: number) => (v === -1 ? "Unlimited" : String(v));
const storage = (mb: number) => (mb === -1 ? "Unlimited" : mb >= 1024 ? `${(mb / 1024).toFixed(0)} GB` : `${mb} MB`);

function Meter({ label, current, max, isStorage }: { label: string; current: number; max: number; isStorage?: boolean }) {
  const unlimited = max === -1;
  const pct = unlimited || max === 0 ? 0 : Math.min(100, (current / max) * 100);
  const tone = pct >= 90 ? "text-error-500" : pct >= 70 ? "text-warning-500" : "text-text-primary";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-text-tertiary">{label}</span>
        <span className={cn("font-medium", tone)}>
          {unlimited ? "Unlimited" : `${isStorage ? storage(current) : current} / ${isStorage ? storage(max) : limit(max)}`}
        </span>
      </div>
      {!unlimited && <Progress progress={pct} />}
    </div>
  );
}

const REASONS: Record<string, string> = {
  projects: "You've reached your project limit on the Free plan. Upgrade to Pro for unlimited projects.",
  clients: "Free plan is limited to 3 clients and 1 team member. Pro gives you unlimited clients and up to 5 team members.",
  members: "You've reached your team member limit on the Free plan. Upgrade to Pro for up to 5 team members, or Lifetime for 100.",
  "custom-domain": "Custom domains are a Pro feature. Upgrade to host your client portal at your own domain.",
};

export function BillingSection() {
  const params = useSearchParams();
  const reason = params.get("reason");
  const checkoutSuccess = params.get("success") === "true";
  const [plans, setPlans] = useState<Plan[]>([]);
  const [lifetimeSeatsRemaining, setLifetimeSeatsRemaining] = useState<number | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<{ plans: Plan[]; lifetimeSeatsRemaining: number | null }>("/billing/plans"),
      apiFetch<{ subscription: Subscription; usage: Usage }>("/billing/subscription"),
    ])
      .then(([p, s]) => {
        setPlans(p.plans);
        setLifetimeSeatsRemaining(p.lifetimeSeatsRemaining);
        setSubscription(s.subscription);
        setUsage(s.usage);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load billing"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (checkoutSuccess) toast.success("Payment received. Your plan will update in a moment.");
  }, [checkoutSuccess]);

  async function checkout(planSlug: string) {
    setBusySlug(planSlug);
    try {
      const res = await apiFetch<{ url: string }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({
          planSlug,
          successUrl: `${window.location.origin}/dashboard/settings/billing?success=true`,
          cancelUrl: `${window.location.origin}/dashboard/settings/billing`,
        }),
      });
      window.location.assign(res.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create checkout session");
      setBusySlug(null);
    }
  }

  async function openPortal() {
    setPortalBusy(true);
    try {
      const res = await apiFetch<{ url: string }>("/billing/portal", {
        method: "POST",
        body: JSON.stringify({ returnUrl: `${window.location.origin}/dashboard/settings/billing` }),
      });
      window.location.href = res.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open payment portal");
      setPortalBusy(false);
    }
  }

  if (loading) return <Loading />;

  const current = subscription?.plan;
  const isFree = !current || current.slug === "free";

  return (
    <div className="space-y-5">
      {reason && REASONS[reason] && <Notice status="warning">{REASONS[reason]}</Notice>}

      <div className="grid gap-5 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = current?.slug === plan.slug;
          const price = plan.isRecurring
            ? `$${(plan.priceMonthly / 100).toFixed(0)}`
            : plan.priceLifetime > 0
              ? `$${(plan.priceLifetime / 100).toFixed(0)}`
              : "Free";
          const soldOut = plan.slug === "lifetime" && lifetimeSeatsRemaining !== null && lifetimeSeatsRemaining <= 0;
          return (
            <Panel
              key={plan.id}
              title={plan.name}
              description={plan.description}
              className={cn(isCurrent && "border-brand-500")}
              action={isCurrent ? <StatusBadge color="primary">Current</StatusBadge> : plan.slug === "pro" && isFree ? <StatusBadge color="primary">Most Popular</StatusBadge> : undefined}
            >
              <div className="space-y-4">
                <p className="text-3xl leading-9 font-semibold tracking-[-0.3px] text-text-primary">
                  {price}
                  {plan.isRecurring && <span className="ml-1 text-sm font-normal text-text-tertiary">/mo</span>}
                  {!plan.isRecurring && plan.priceLifetime > 0 && <span className="ml-1 text-sm font-normal text-text-tertiary">one-time</span>}
                </p>
                {plan.slug === "lifetime" && lifetimeSeatsRemaining !== null && (
                  <StatusBadge color={soldOut ? "error" : "warning"}>
                    {soldOut ? "Sold out" : `${lifetimeSeatsRemaining} of ${plan.maxSeats} seats remaining`}
                  </StatusBadge>
                )}
                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="text-success-500">{"✓"}</span>
                      {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && plan.slug !== "free" && (
                  <ActionButton variant="primary" className="w-full" loading={busySlug === plan.slug} isDisabled={soldOut} onPress={() => checkout(plan.slug)}>
                    {plan.slug === "lifetime" ? "Get Lifetime" : `Upgrade to ${plan.name}`}
                  </ActionButton>
                )}
              </div>
            </Panel>
          );
        })}
      </div>

      {subscription && current && usage && (
        <Panel
          title="Current plan"
          description={current.name}
          action={
            <>
              <StatusPill status={subscription.status === "active" ? "active" : subscription.status === "past_due" || subscription.status === "trialing" ? "pending" : "failed"} label={subscription.status} />
              {subscription.stripeSubscriptionId && (
                <Button size="sm" appearance="outline" variant="primary" isDisabled={portalBusy} onPress={openPortal}>
                  Manage payment & invoices
                </Button>
              )}
            </>
          }
        >
          <div className="space-y-4">
            {subscription.currentPeriodEnd && (
              <p className="text-sm text-text-secondary">
                {subscription.cancelAtPeriodEnd ? "Ends" : "Renews"} on {fmtDate(subscription.currentPeriodEnd)}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Meter label="Projects" current={usage.projects} max={current.maxProjects} />
              <Meter label="Storage" current={usage.storageMb} max={current.maxStorageMb} isStorage />
              <Meter label="Team Members" current={usage.members} max={current.maxMembers} />
              <Meter label="Clients" current={usage.clients} max={current.maxClients} />
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
