import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Shared list-screen toolbar: search on the left, filters/actions on the
 * right. Matches the NextAdmin card-header pattern.
 */
export function DataToolbar({
  children,
  trailing,
  className,
}: {
  children?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-card-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
      {trailing ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{trailing}</div>
      ) : null}
    </div>
  );
}

/** Consistent vertical rhythm for page sections. */
export function PageSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cn("space-y-4", className)}>{children}</section>;
}

export function SectionHeading({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-base leading-6 font-semibold tracking-[-0.2px] text-text-primary">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-sm leading-5 text-text-tertiary">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
