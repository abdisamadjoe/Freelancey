import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { isValidElement, type ReactNode } from "react";

/**
 * Empty state used across the app, styled to the template's card language.
 */
export interface EmptyStateProps {
  icon?: LucideIcon | ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** `card` renders its own bordered surface; `plain` sits inside an existing card. */
  variant?: "card" | "plain";
}

function renderIcon(icon: EmptyStateProps["icon"]) {
  if (!icon) return null;
  // Already rendered, e.g. `icon={<FolderKanban className="size-5" />}`.
  if (isValidElement(icon)) return icon;
  // A component: plain function components and forwardRef objects (which is
  // what every lucide-react icon is) both render as `<Icon />`.
  if (typeof icon === "function" || (typeof icon === "object" && "$$typeof" in icon)) {
    const Icon = icon as LucideIcon;
    return <Icon className="size-5" aria-hidden />;
  }
  return null;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  variant = "card",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        variant === "card" && "rounded-xl border-[0.5px] border-card-border bg-card-background",
        className,
      )}
    >
      {icon ? (
        <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-background-gray-secondary text-icon-tertiary">
          {renderIcon(icon)}
        </span>
      ) : null}
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm leading-5 text-text-tertiary">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex items-center gap-2">{action}</div> : null}
    </div>
  );
}
