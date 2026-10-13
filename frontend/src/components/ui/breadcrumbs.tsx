import { cn } from "@/lib/utils";
import { ChevronRight } from "@tailgrids/icons";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The template's Breadcrumbs (tailgrids/core/breadcrumbs.tsx) with the chevron divider its pages use.
 * An item without an `href` renders as plain text (the current page).
 */
export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
}

export function Breadcrumbs({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className={cn("flex items-center gap-2", className)}>
        {items.map((item, index) => {
          const isLast = index + 1 === items.length;
          const itemClass = cn(
            "flex items-center gap-1 text-sm font-medium [&>svg]:size-4",
            isLast ? "text-text-primary" : "text-text-tertiary",
          );
          return (
            <li key={index} className="contents text-text-tertiary [&_svg]:text-current!">
              {index > 0 && <ChevronRight className="size-4" aria-hidden />}
              {item.href && !isLast ? (
                <Link href={item.href} className={itemClass}>
                  {item.label}
                </Link>
              ) : (
                <span className={itemClass} aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
