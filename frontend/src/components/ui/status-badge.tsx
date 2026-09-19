import { cn } from "@/lib/utils";
import { Badge, type BadgeColor } from "./badge";

/**
 * Central status → badge colour mapping so every module renders the same
 * status vocabulary with the same colours.
 */
const STATUS_COLORS: Record<string, BadgeColor> = {
  /* Project */
  not_started: "gray",
  in_progress: "blue",
  in_review: "warning",
  completed: "success",
  on_hold: "gray",
  cancelled: "error",
  archived: "gray",

  /* Tasks */
  open: "gray",
  done: "success",

  /* Invoices */
  draft: "gray",
  sent: "blue",
  paid: "success",
  overdue: "error",
  void: "gray",
  voided: "gray",

  /* Contracts / documents */
  pending: "warning",
  accepted: "success",
  declined: "error",
  acknowledged: "blue",
  signed: "success",
  expired: "gray",

  /* Generic */
  active: "success",
  inactive: "gray",
  failed: "error",
  success: "success",
  error: "error",
  warning: "warning",
  info: "blue",
};

export function statusColor(status: string | null | undefined): BadgeColor {
  if (!status) return "gray";
  return STATUS_COLORS[status.toLowerCase().replace(/[\s-]+/g, "_")] ?? "gray";
}

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  in_review: "In Review",
  completed: "Completed",
};

export function statusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  const normalized = status.toLowerCase().replace(/[\s-]+/g, "_");
  if (STATUS_LABELS[normalized]) return STATUS_LABELS[normalized];
  return normalized
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Renders a status pill with the shared colour mapping. */
export function StatusBadge({
  status,
  label,
  className,
  withDot = true,
}: {
  status: string | null | undefined;
  label?: string;
  className?: string;
  withDot?: boolean;
}) {
  const color = statusColor(status);
  const text = label ?? statusLabel(status);

  return (
    <Badge color={color} className={className}>
      {withDot ? <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden /> : null}
      {text}
    </Badge>
  );
}
