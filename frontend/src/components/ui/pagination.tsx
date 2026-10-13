"use client";

import { Pagination as TemplatePagination } from "@/components/tailgrids/core/pagination";
import { cn } from "@/lib/utils";

/**
 * Renders the template's Pagination (tailgrids/core/pagination.tsx) behind the app's
 * existing `{ page, totalPages, onPageChange }` contract.
 */
export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={cn("w-full", className)}>
      <TemplatePagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
