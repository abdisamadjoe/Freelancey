"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Button, Card, CardDescription, CardHeader, CardTitle, Progress } from "@/components/ui";
import { type MyOnboarding, portalStepHref } from "@/lib/onboarding";

/** "Get started" checklist shown to a client until every step is done. Renders nothing otherwise. */
export function PortalOnboardingCard() {
  const { error: showError } = useToast();
  const [data, setData] = useState<MyOnboarding | null>(null);

  const load = useCallback(() => {
    apiFetch<MyOnboarding>("/client-onboarding/mine")
      .then(setData)
      .catch(() => setData(null));
  }, []);

  useEffect(load, [load]);

  async function toggle(id: string, done: boolean) {
    try {
      await apiFetch(`/client-onboarding/mine/items/${id}`, { method: "POST", body: JSON.stringify({ done }) });
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not update this step");
    }
  }

  if (!data || data.items.length === 0 || data.progress.complete) return null;

  return (
    <Card className="p-0">
      <CardHeader className="px-5 py-4">
        <div className="min-w-0">
          <CardTitle>Get started</CardTitle>
          <CardDescription>
            {data.progress.done} of {data.progress.total} steps done
          </CardDescription>
        </div>
      </CardHeader>
      <div className="px-5 pb-3">
        <Progress value={(data.progress.done / data.progress.total) * 100} />
      </div>
      <ul className="divide-y divide-card-border border-t border-card-border">
        {data.items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 px-5 py-3">
            {item.done ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-alert-success-title" aria-label="Done" />
            ) : (
              <Circle className="mt-0.5 size-5 shrink-0 text-text-tertiary" aria-label="Not done" />
            )}
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${item.done ? "text-text-tertiary line-through" : "text-text-primary"}`}>
                {item.title}
              </p>
              {item.description && !item.done && <p className="text-xs text-text-tertiary">{item.description}</p>}
            </div>
            {!item.done && (
              <div className="flex shrink-0 gap-2">
                {item.canToggle ? (
                  <Button type="button" size="xs" appearance="outline" iconOnly={false} onClick={() => toggle(item.id, true)}>
                    Mark done
                  </Button>
                ) : (
                  <Link href={portalStepHref(item)} className="text-xs font-medium text-neutral-brand-color hover:underline">
                    {item.kind === "intake" ? "Start" : "Open"}
                  </Link>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
