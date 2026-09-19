"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  SectionHeading,
  Skeleton,
  StatusBadge,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  Check,
  Zap,
  Crown,
  ExternalLink,
  Folder,
  Users,
  Globe,
} from "lucide-react";

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

function formatLimit(value: number): string {
  return value === -1 ? "Unlimited" : String(value);
}

function formatStorage(mb: number): string {
  if (mb === -1) return "Unlimited";
  if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`;
  return `${mb} MB`;
}

/** Maps a Stripe subscription status onto the shared status-badge vocabulary. */
function subscriptionStatus(status: string): string {
  if (status === "active") return "active";
  if (status === "past_due" || status === "trialing") return "pending";
  return "failed";
}

function UsageMeter({
  label,
  current,
  max,
  format = "number",
}: {
  label: string;
  current: number;
  max: number;
  format?: "number" | "storage";
}) {
  const isUnlimited = max === -1;
  const pct = (isUnlimited || max === 0) ? 0 : Math.min(100, (current / max) * 100);
  const displayMax = format === "storage" ? formatStorage(max) : formatLimit(max);
  const displayCurrent = format === "storage" ? formatStorage(current) : String(current);
  const textTone = pct >= 90 ? "text-error-500" : pct >= 70 ? "text-warning-500" : "text-text-primary";
  const barTone = pct >= 90 ? "bg-error-500" : pct >= 70 ? "bg-warning-500" : "bg-button-primary-background";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-text-tertiary">{label}</span>
        <span className={cn("font-medium", textTone)}>
          {isUnlimited ? "Unlimited" : `${displayCurrent} / ${displayMax}`}
        </span>
      </div>
      {!isUnlimited && <Progress value={pct} className="h-1.5" barClassName={barTone} />}
    </div>
  );
}

const REASON_BANNER: Record<string, { icon: React.ElementType; text: string; sub: string }> = {
  projects: {
    icon: Folder,
    text: "You've reached your project limit on the Free plan.",
    sub: "Upgrade to Pro for unlimited projects.",
  },
  clients: {
    icon: Users,
    text: "Free plan is limited to 3 clients and 1 team member.",
    sub: "Pro gives you unlimited clients and up to 5 team members.",
  },
  members: {
    icon: Users,
    text: "You've reached your team member limit on the Free plan.",
    sub: "Upgrade to Pro for up to 5 team members, or Lifetime for 100.",
  },
  "custom-domain": {
    icon: Globe,
    text: "Custom domains are a Pro feature.",
    sub: "Upgrade to host your client portal at your own domain.",
  },
};

function PlanCard({
  plan,
  isCurrentPlan,
  isFree,
  lifetimeSeatsRemaining,
  onSelect,
  loadingSlug,
}: {
  plan: Plan;
  isCurrentPlan: boolean;
  isFree: boolean;
  lifetimeSeatsRemaining: number | null;
  onSelect: (slug: string) => void;
  loadingSlug: string | null;
}) {
  const isPro = plan.slug === "pro";
  const isLifetime = plan.slug === "lifetime";
  const isRecommended = isPro && isFree;

  const price = plan.isRecurring
    ? `$${(plan.priceMonthly / 100).toFixed(0)}`
    : plan.priceLifetime > 0
      ? `$${(plan.priceLifetime / 100).toFixed(0)}`
      : "Free";

  const seatsLeft = isLifetime && lifetimeSeatsRemaining !== null ? lifetimeSeatsRemaining : null;
  const soldOut = seatsLeft !== null && seatsLeft <= 0;

  return (
    <Card
      className={cn(
        "relative flex flex-col gap-4",
        isRecommended && "border-brand-500 shadow-sm",
        isCurrentPlan && !isRecommended && "border-brand-500",
        !isRecommended && !isCurrentPlan && "opacity-95",
      )}
    >
      {/* Top accent bar */}
      {isRecommended && (
        <span className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl bg-brand-500" aria-hidden />
      )}

      {/* Header */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {plan.slug === "pro" && <Zap className="size-4 text-neutral-brand-color" aria-hidden />}
          {plan.slug === "lifetime" && <Crown className="size-4 text-warning-500" aria-hidden />}
          <CardTitle>{plan.name}</CardTitle>
          {isCurrentPlan && <Badge color="primary">Current</Badge>}
          {isRecommended && <Badge color="primary">Most Popular</Badge>}
        </div>
        <p className="text-xs leading-5 text-text-tertiary">{plan.description}</p>
      </div>

      {/* Price */}
      <div className="flex items-end gap-1">
        <span className="text-3xl leading-9 font-semibold tracking-[-0.3px] text-text-primary">
          {price}
        </span>
        {plan.isRecurring && (
          <span className="mb-0.5 text-sm text-text-tertiary">/mo</span>
        )}
        {!plan.isRecurring && plan.priceLifetime > 0 && (
          <span className="mb-0.5 text-sm text-text-tertiary">one-time</span>
        )}
      </div>

      {/* Lifetime scarcity meter */}
      {isLifetime && seatsLeft !== null && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-text-tertiary">Founding member spots</span>
            <span className={cn("font-medium", seatsLeft < 20 ? "text-warning-500" : "text-text-primary")}>
              {seatsLeft} of {plan.maxSeats} left
            </span>
          </div>
          <Progress
            value={plan.maxSeats - seatsLeft}
            max={plan.maxSeats}
            className="h-1.5"
            barClassName="bg-warning-500"
          />
        </div>
      )}

      {/* Features */}
      <ul className="flex-1 space-y-1.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-xs leading-5 text-text-tertiary">
            <Check className="size-3 shrink-0 text-success-500" aria-hidden />
            {feature}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {!isCurrentPlan && plan.slug !== "free" && (
        <Button
          type="button"
          variant="primary"
          appearance={isPro ? "fill" : "outline"}
          className="w-full"
          onClick={() => onSelect(plan.slug)}
          disabled={loadingSlug !== null || soldOut}
          loading={loadingSlug === plan.slug}
        >
          {soldOut
            ? "Sold Out"
            : isLifetime
              ? "Become a Founding Member"
              : `Upgrade to ${plan.name} — $${(plan.priceMonthly / 100).toFixed(0)}/mo`}
        </Button>
      )}

      {isCurrentPlan && plan.slug !== "free" && (
        <p className="text-center text-xs leading-5 text-text-tertiary">Your current plan</p>
      )}
    </Card>
  );
}

export function BillingSection() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [lifetimeSeatsRemaining, setLifetimeSeatsRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoadingSlug, setCheckoutLoadingSlug] = useState<string | null>(null);
  const { success, error: showError } = useToast();

  // Capture URL params once at mount — replaceState later clears them from the URL
  // so we must not re-derive these on every render.
  const [checkoutSuccess] = useState(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("success") === "true" : false,
  );
  const [reason] = useState(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("reason") ?? null : null,
  );
  const reasonBanner = reason ? REASON_BANNER[reason] ?? null : null;

  useEffect(() => {
    if (checkoutSuccess) {
      success("Subscription activated! Thank you for upgrading.");
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Promise.all([
      apiFetch<{ plans: Plan[]; lifetimeSeatsRemaining: number | null }>("/billing/plans"),
      apiFetch<{ subscription: Subscription; usage: Usage }>("/billing/subscription"),
    ])
      .then(([plansData, subData]) => {
        setPlans(plansData.plans);
        setLifetimeSeatsRemaining(plansData.lifetimeSeatsRemaining);
        setSubscription(subData.subscription);
        setUsage(subData.usage);
        setLoading(false);
      })
      .catch((err) => {
        showError(err instanceof Error ? err.message : "Failed to load billing data");
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpgrade = async (planSlug: string) => {
    setCheckoutLoadingSlug(planSlug);
    try {
      const result = await apiFetch<{ url: string }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({
          planSlug,
          successUrl: `${window.location.origin}/dashboard/settings/billing?success=true`,
          cancelUrl: `${window.location.origin}/dashboard/settings/billing`,
        }),
      });
      if (result.url) window.location.href = result.url;
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to create checkout session");
      setCheckoutLoadingSlug(null);
    }
  };

  const handleManagePayment = async () => {
    try {
      const result = await apiFetch<{ url: string }>("/billing/portal", {
        method: "POST",
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/dashboard/settings/billing`,
        }),
      });
      if (result.url) window.location.href = result.url;
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to open payment portal");
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Card key={index}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-4 h-8 w-20" />
              <div className="mt-5 space-y-2">
                <Skeleton className="h-2.5 w-full" />
                <Skeleton className="h-2.5 w-4/5" />
                <Skeleton className="h-2.5 w-3/5" />
              </div>
              <Skeleton className="mt-6 h-9 w-full rounded-lg" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const currentPlan = subscription?.plan;
  const isFree = !currentPlan || currentPlan.slug === "free";

  return (
    <div className="space-y-5">
      {/* Contextual reason banner */}
      {reasonBanner && isFree && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-card-border bg-background-gray-primary px-4 py-3.5">
          <reasonBanner.icon className="size-4 shrink-0 text-neutral-brand-color" aria-hidden />
          <span className="text-sm font-medium text-text-primary">{reasonBanner.text}</span>{" "}
          <span className="text-sm text-text-tertiary">{reasonBanner.sub}</span>
        </div>
      )}

      {/* Plans — primary focus */}
      <section className="space-y-4">
        <SectionHeading title="Plans" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrentPlan={currentPlan?.slug === plan.slug}
              isFree={isFree}
              lifetimeSeatsRemaining={lifetimeSeatsRemaining}
              onSelect={handleUpgrade}
              loadingSlug={checkoutLoadingSlug}
            />
          ))}
        </div>
      </section>

      {/* Current plan + usage — compact, secondary */}
      {subscription && currentPlan && usage && (
        <Card>
          <CardHeader>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <CreditCard className="size-4 text-icon-tertiary" aria-hidden />
              <span className="text-sm font-medium text-text-primary">{currentPlan.name}</span>
              <StatusBadge
                status={subscriptionStatus(subscription.status)}
                label={subscription.status}
              />
              {subscription.currentPeriodEnd && (
                <span className="text-xs text-text-tertiary">
                  · {subscription.cancelAtPeriodEnd ? "Cancels" : "Renews"}{" "}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              )}
              {!currentPlan.isRecurring && currentPlan.slug === "lifetime" && (
                <span className="text-xs text-text-tertiary">· Lifetime access</span>
              )}
            </div>
            {subscription.stripeSubscriptionId && (
              <Button
                type="button"
                appearance="ghost"
                variant="primary"
                size="xs"
                onClick={handleManagePayment}
              >
                Manage
                <ExternalLink aria-hidden />
              </Button>
            )}
          </CardHeader>

          <CardContent className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <UsageMeter label="Projects" current={usage.projects} max={currentPlan.maxProjects} />
            <UsageMeter label="Storage" current={usage.storageMb} max={currentPlan.maxStorageMb} format="storage" />
            <UsageMeter label="Team Members" current={usage.members} max={currentPlan.maxMembers} />
            <UsageMeter label="Clients" current={usage.clients} max={currentPlan.maxClients} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
