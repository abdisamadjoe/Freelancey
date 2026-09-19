"use client";

import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { forwardRef, type ComponentProps } from "react";

/**
 * Search field with the template's input metric and a leading icon, used by
 * every list screen's toolbar.
 */
export interface SearchInputProps extends Omit<ComponentProps<"input">, "type"> {
  onClear?: () => void;
  wrapperClassName?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { className, wrapperClassName, onClear, value, ...props },
  ref,
) {
  const hasValue = typeof value === "string" && value.length > 0;

  return (
    <div className={cn("relative w-full", wrapperClassName)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-icon-tertiary"
        aria-hidden
      />
      <input
        ref={ref}
        type="search"
        value={value}
        className={cn(
          "h-10 w-full rounded-lg border border-card-border bg-input-background pr-9 pl-10 text-sm text-text-primary",
          "outline-none transition placeholder:text-input-placeholder-text",
          "hover:border-input-border",
          "focus:border-input-primary-focus-border focus:ring-4 focus:ring-input-primary-focus-border/20",
          "[&::-webkit-search-cancel-button]:appearance-none",
          className,
        )}
        {...props}
      />
      {hasValue && onClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute top-1/2 right-3 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
});
