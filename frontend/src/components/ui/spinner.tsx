import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/** Spinner sized to the template's control metrics. */
export function Spinner({
  className,
  size = 16,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Loader2
      className={cn("animate-spin text-icon-tertiary", className)}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

/** Centered spinner for panels and route-level loading states. */
export function LoadingState({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16", className)}>
      <Spinner size={20} />
      <p className="text-sm text-text-tertiary">{label}</p>
    </div>
  );
}
