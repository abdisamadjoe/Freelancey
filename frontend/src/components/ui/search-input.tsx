"use client";

import { SearchIcon } from "@/components/common/header/icons";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/tailgrids/core/input-group";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { ComponentProps } from "react";

/**
 * Search field built from the template's InputGroup with its search icon addon
 * (the same field its header search uses), for every list screen's toolbar.
 */
export interface SearchInputProps extends Omit<ComponentProps<"input">, "type"> {
  onClear?: () => void;
  wrapperClassName?: string;
}

export function SearchInput({ className, wrapperClassName, onClear, value, ...props }: SearchInputProps) {
  const hasValue = typeof value === "string" && value.length > 0;

  return (
    <InputGroup className={cn("h-10", wrapperClassName)}>
      <InputGroupAddon align="inline-start" className="pr-0 text-icon-tertiary">
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        value={value}
        className={cn("pl-2 text-sm [&::-webkit-search-cancel-button]:appearance-none", className)}
        {...props}
      />
      {hasValue && onClear ? (
        <InputGroupAddon align="inline-end">
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="flex size-5 items-center justify-center rounded-full text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary"
          >
            <X className="size-3.5" />
          </button>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}
