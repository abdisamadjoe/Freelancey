"use client";

import { cn } from "@/lib/utils";

function textColorForBackground(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // W3C relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

/**
 * Workspace-defined label chip. The colour is user data, so it stays inline
 * rather than being mapped onto a design token.
 */
export function LabelBadge({
  name,
  color,
  className,
}: {
  name: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs leading-4 font-medium whitespace-nowrap",
        className,
      )}
      style={{ backgroundColor: color, color: textColorForBackground(color) }}
    >
      {name}
    </span>
  );
}
