"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  StatusBadge,
} from "@/components/ui";

interface ProjectStatus {
  id: string;
  name: string;
  slug: string;
  color: string;
  order: number;
}

/**
 * Project workflow stepper. The stages, ordering and handlers are unchanged —
 * only the presentation moved onto the design-system card / stepper language.
 */
export function StatusPipeline({
  statuses,
  currentStatus,
  onStatusChange,
  disabled,
}: {
  statuses: ProjectStatus[];
  currentStatus: string;
  onStatusChange: (slug: string) => void;
  disabled?: boolean;
}) {
  const currentIndex = statuses.findIndex((s) => s.slug === currentStatus);
  const current = currentIndex >= 0 ? statuses[currentIndex] : undefined;
  const total = statuses.length;
  const reached = currentIndex >= 0 ? currentIndex + 1 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status</CardTitle>
        <CardAction>
          <StatusBadge status={currentStatus} label={current?.name} />
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        {total > 0 ? (
          <>
            <ol className="space-y-1">
              {statuses.map((stage, index) => {
                const isCurrent = stage.slug === currentStatus;
                const isDone = currentIndex >= 0 && index < currentIndex;

                return (
                  <li key={stage.id}>
                    <button
                      type="button"
                      onClick={() => onStatusChange(stage.slug)}
                      disabled={disabled}
                      data-active={isCurrent}
                      aria-current={isCurrent ? "step" : undefined}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                        "focus-visible:ring-4 focus-visible:ring-button-outline-focus-ring focus-visible:outline-none",
                        isCurrent
                          ? "bg-background-gray-secondary_alt font-medium text-text-primary"
                          : "text-text-tertiary hover:bg-background-gray-secondary_alt/60 hover:text-text-primary",
                        disabled && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full border-[0.5px]",
                          isDone && "border-primary-500 bg-primary-500 text-white-100",
                          isCurrent && !isDone && "border-primary-500 bg-card-background text-neutral-brand-color",
                          !isCurrent && !isDone && "border-card-border bg-card-background text-icon-tertiary",
                        )}
                      >
                        {isDone ? (
                          <Check className="size-3" />
                        ) : (
                          <span className="size-1.5 rounded-full bg-current" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{stage.name}</span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="space-y-1.5">
              <Progress value={reached} max={total} />
              <p className="text-right text-xs text-text-tertiary">
                {reached}/{total}
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-text-tertiary">No workflow stages configured.</p>
        )}
      </CardContent>
    </Card>
  );
}
