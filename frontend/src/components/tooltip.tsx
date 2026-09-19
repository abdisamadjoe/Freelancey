"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Side = "top" | "bottom" | "left" | "right";

const SIDE_CLASS: Record<Side, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
  left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
  right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
};

/**
 * Lightweight tooltip styled to the template's tooltip tokens
 * (dashboard/src/components/tailgrids/core/tooltip.tsx).
 */
export function Tooltip({
  label,
  side = "top",
  children,
}: {
  label: string;
  side?: Side;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open ? (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 rounded-lg border border-tooltip-border bg-tooltip-background px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-tooltip-text-color shadow-md",
            SIDE_CLASS[side],
          )}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
