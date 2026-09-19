import { cn } from "@/lib/utils";

/** Progress bar styled to the template's primary/gray tokens. */
export function Progress({
  value,
  max = 100,
  className,
  barClassName,
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-background-gray-secondary", className)}
    >
      <div
        className={cn("h-full rounded-full bg-button-primary-background transition-all", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
