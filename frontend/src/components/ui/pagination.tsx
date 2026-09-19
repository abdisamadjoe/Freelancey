"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Pagination primitive ported from the NextAdmin template
 * (dashboard/src/components/tailgrids/core/pagination.tsx). Keeps the app's
 * existing `{ page, totalPages, onPageChange }` contract.
 */
export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** Number of page buttons rendered around the current page. */
  siblings?: number;
}

function getPageItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const items: (number | "ellipsis")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) items.push("ellipsis");
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < total - 1) items.push("ellipsis");
  items.push(total);

  return items;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageButton =
    "flex size-8 items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:ring-4 focus-visible:ring-button-outline-focus-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn("flex flex-wrap items-center justify-between gap-3", className)}
    >
      <p className="text-sm text-text-tertiary">
        Page <span className="font-medium text-text-primary">{page}</span> of {totalPages}
      </p>

      <ul className="flex items-center gap-1">
        <li>
          <button
            type="button"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className={cn(pageButton, "text-icon-secondary hover:bg-background-gray-secondary")}
          >
            <ChevronLeft className="size-4" />
          </button>
        </li>

        {getPageItems(page, totalPages).map((item, index) =>
          item === "ellipsis" ? (
            <li key={`ellipsis-${index}`} className="px-1.5 text-sm text-text-tertiary">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                aria-label={`Go to page ${item}`}
                aria-current={item === page ? "page" : undefined}
                onClick={() => onPageChange(item)}
                className={cn(
                  pageButton,
                  item === page
                    ? "bg-tab-secondary-active-background text-neutral-brand-color"
                    : "text-text-secondary hover:bg-background-gray-secondary",
                )}
              >
                {item}
              </button>
            </li>
          ),
        )}

        <li>
          <button
            type="button"
            aria-label="Next page"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className={cn(pageButton, "text-icon-secondary hover:bg-background-gray-secondary")}
          >
            <ChevronRight className="size-4" />
          </button>
        </li>
      </ul>
    </nav>
  );
}
