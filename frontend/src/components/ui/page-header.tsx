import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs";

/**
 * Page title block used by every screen, matching the NextAdmin page header
 * (title on the left, breadcrumbs on the right, actions below/right).
 */
export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  /** Rendered between the title block and the actions (e.g. tabs). */
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col-reverse items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="text-2xl leading-8 font-medium tracking-[-0.3px] text-text-primary">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm leading-5 text-text-tertiary">{description}</p>
          ) : null}
        </div>

        {breadcrumbs && breadcrumbs.length > 0 ? (
          <Breadcrumbs items={breadcrumbs} className="shrink-0 pt-1 sm:pt-0" />
        ) : null}
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
      ) : null}

      {children}
    </div>
  );
}
