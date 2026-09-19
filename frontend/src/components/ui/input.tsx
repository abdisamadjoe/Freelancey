"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { forwardRef } from "react";

/**
 * Ported from the NextAdmin template's Input / TextArea / Label / Field
 * primitives (dashboard/src/components/tailgrids/core/*), rebuilt on top of
 * native form elements so existing form logic keeps working unchanged.
 */
const controlStyles = cn(
  "w-full rounded-lg border border-card-border bg-input-background px-3.5 py-2.5 text-sm text-text-primary",
  "outline-none transition placeholder:text-input-placeholder-text",
  "hover:border-input-border",
  "focus:border-input-primary-focus-border focus:ring-4 focus:ring-input-primary-focus-border/20",
  "disabled:cursor-not-allowed disabled:border-input-disabled-border disabled:bg-input-disabled-background disabled:text-input-disabled-text disabled:placeholder:text-input-disabled-text",
);

const errorStyles = cn(
  "border-input-error-focus-border focus:border-input-error-focus-border focus:ring-input-error-focus-border/20",
);

export interface InputProps extends ComponentProps<"input"> {
  /** Renders the error styling (red border/ring). */
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, "aria-invalid": ariaInvalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid ?? ariaInvalid}
      className={cn(controlStyles, (invalid ?? ariaInvalid) && errorStyles, className)}
      {...props}
    />
  );
});

export interface TextareaProps extends ComponentProps<"textarea"> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, rows = 4, "aria-invalid": ariaInvalid, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid ?? ariaInvalid}
      className={cn(
        controlStyles,
        "resize-y py-3",
        (invalid ?? ariaInvalid) && errorStyles,
        className,
      )}
      {...props}
    />
  );
});

export interface SelectProps extends ComponentProps<"select"> {
  invalid?: boolean;
}

export const NativeSelect = forwardRef<HTMLSelectElement, SelectProps>(function NativeSelect(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid}
        className={cn(
          controlStyles,
          "cursor-pointer appearance-none pr-10",
          invalid && errorStyles,
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-icon-tertiary"
        aria-hidden
      />
    </div>
  );
});

export function Label({ className, children, ...props }: ComponentProps<"label">) {
  return (
    <label className={cn("block text-sm font-medium text-input-label-text-color", className)} {...props}>
      {children}
    </label>
  );
}

export function FieldDescription({ className, children, ...props }: ComponentProps<"p">) {
  return (
    <p className={cn("text-xs leading-5 text-text-tertiary", className)} {...props}>
      {children}
    </p>
  );
}

export function FieldError({ className, children, ...props }: ComponentProps<"p">) {
  if (!children) return null;
  return (
    <p role="alert" className={cn("text-xs leading-5 text-input-error", className)} {...props}>
      {children}
    </p>
  );
}

export interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

/** Label + control + description/error stack used by every form in the app. */
export function Field({
  label,
  htmlFor,
  description,
  error,
  required,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor}>
          {label}
          {required ? <span className="ml-0.5 text-input-error">*</span> : null}
        </Label>
      ) : null}
      {children}
      {error ? <FieldError>{error}</FieldError> : description ? (
        <FieldDescription>{description}</FieldDescription>
      ) : null}
    </div>
  );
}
