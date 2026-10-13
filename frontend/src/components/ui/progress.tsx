import { cn } from "@/lib/utils";

/** The template's progress bar (tailgrids/core/progress.tsx): a 6px track with a brand-coloured fill. */
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
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-border-primary", className)}
    >
      <div
        className={cn("size-full rounded-full bg-brand-500", barClassName)}
        style={{ transform: `translateX(-${100 - pct}%)` }}
      />
    </div>
  );
}
