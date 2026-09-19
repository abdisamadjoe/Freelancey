"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { forwardRef, type ComponentProps } from "react";

/** Checkbox styled to the template's checkbox tokens. */
export interface CheckboxProps extends Omit<ComponentProps<"input">, "type"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, label, description, id, ...props },
  ref,
) {
  const input = (
    <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={cn(
          "peer size-4 cursor-pointer appearance-none rounded border border-input-border bg-checkbox-background transition",
          "checked:border-checkbox-checked-border checked:bg-checkbox-checked-background",
          "focus-visible:ring-4 focus-visible:ring-button-primary-focus-ring focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:border-input-disabled-border disabled:bg-input-disabled-background",
          className,
        )}
        {...props}
      />
      <Check className="pointer-events-none absolute size-3 text-checkbox-checked-icon-color opacity-0 peer-checked:opacity-100" />
    </span>
  );

  if (!label && !description) return input;

  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 select-none">
      <span className="pt-0.5">{input}</span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-text-primary">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-text-tertiary">{description}</span>
        ) : null}
      </span>
    </label>
  );
});

/** Toggle switch styled to the template's toggle tokens. */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  id,
  className,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  label?: React.ReactNode;
}) {
  const control = (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        "focus-visible:ring-4 focus-visible:ring-button-primary-focus-ring focus-visible:outline-none",
        checked ? "bg-toggle-active-background" : "bg-toggle-default-background",
        disabled && "cursor-not-allowed bg-toggle-disabled-background",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none size-4 rounded-full bg-white shadow-xs transition-transform",
          checked ? "translate-x-4.5" : "translate-x-0.5",
        )}
      />
    </button>
  );

  if (!label) return control;

  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5 select-none">
      {control}
      <span className="text-sm font-medium text-text-primary">{label}</span>
    </label>
  );
}
