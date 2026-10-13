"use client";

import { ListRows, Panel, StatusBadge } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { Progress } from "@/components/tailgrids/core/progress";
import { apiFetch } from "@/lib/api";
import { type MyOnboarding, portalStepHref } from "@/lib/onboarding";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

/** "Get started" checklist shown to a client until every step is done. Renders nothing otherwise. */
export function PortalOnboardingCard() {
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
      toast.error(err instanceof Error ? err.message : "Could not update this step");
    }
  }

  if (!data || data.items.length === 0 || data.progress.complete) return null;

  return (
    <Panel flush title="Get started" description={`${data.progress.done} of ${data.progress.total} steps done`}>
      <div className="px-5 pb-3">
        <Progress progress={(data.progress.done / data.progress.total) * 100} />
      </div>
      <ListRows className="border-t border-card-border">
        {data.items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 px-5 py-3">
            <StatusBadge color={item.done ? "success" : "gray"}>{item.done ? "Done" : "To do"}</StatusBadge>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${item.done ? "text-text-tertiary line-through" : "text-text-primary"}`}>{item.title}</p>
              {item.description && !item.done && <p className="text-xs text-text-tertiary">{item.description}</p>}
            </div>
            {!item.done && (
              <div className="flex shrink-0 gap-2">
                {item.canToggle ? (
                  <Button size="xs" appearance="outline" variant="primary" onPress={() => toggle(item.id, true)}>
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
      </ListRows>
    </Panel>
  );
}
