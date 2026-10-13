"use client";

import { Spinner as TemplateSpinner } from "@/components/tailgrids/core/spinner";
import { cn } from "@/lib/utils";

/** The template's spinner (tailgrids/core/spinner) at the closest of its sizes to the pixel size asked for. */
export function Spinner({ className, size = 16 }: { className?: string; size?: number }) {
  const step = size <= 20 ? "sm" : size <= 28 ? "md" : size <= 36 ? "lg" : size <= 40 ? "xl" : "xxl";
  return <TemplateSpinner size={step} className={cn("text-brand-500", className)} />;
}

/** Centered spinner for panels and route-level loading states. */
export function LoadingState({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16", className)}>
      <Spinner size={28} />
      <p className="text-sm text-text-tertiary">{label}</p>
    </div>
  );
}
