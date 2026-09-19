"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef, isValidElement, type ButtonHTMLAttributes, type ReactNode } from "react";

/** True when a button's children are only icons (no visible text). */
function isIconOnlyChildren(children: ReactNode): boolean {
  if (children === null || children === undefined || children === false) return true;
  if (Array.isArray(children)) return children.every(isIconOnlyChildren);
  return isValidElement(children);
}

/**
 * Ported from the NextAdmin template's Button primitive
 * (dashboard/src/components/tailgrids/core/button.tsx), rebuilt as a plain
 * button so it needs no React Aria dependency.
 */
export const buttonStyles = cva(
  "inline-flex shrink-0 items-center justify-center rounded-lg text-sm font-medium outline-none transition [&>svg]:shrink-0 focus-visible:ring-4 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "",
        danger: "",
        success: "",
        ghost: "",
      },
      appearance: {
        fill: "",
        outline: "",
        ghost: "",
      },
      iconOnly: {
        true: "",
        false: "",
      },
      size: {
        xs: "[&>svg]:size-4",
        sm: "[&>svg]:size-4",
        md: "[&>svg]:size-4",
        lg: "[&>svg]:size-4",
        xl: "[&>svg]:size-5",
        xxl: "[&>svg]:size-5",
      },
    },
    compoundVariants: [
      /* ---------- Disabled ---------- */
      {
        variant: ["primary", "danger", "success"],
        appearance: "fill",
        className:
          "text-white-100 disabled:bg-button-disabled-background disabled:text-button-disabled-text",
      },
      {
        variant: ["primary", "danger", "success"],
        appearance: "outline",
        className:
          "border disabled:border-button-outline-disabled-border disabled:bg-button-outline-disabled-background disabled:text-button-outline-disabled-text",
      },
      {
        variant: ["primary", "danger", "success"],
        appearance: "ghost",
        className: "disabled:bg-transparent disabled:text-button-outline-disabled-text",
      },

      /* ---------- Primary ---------- */
      {
        variant: "primary",
        appearance: "fill",
        className:
          "bg-button-primary-background text-button-primary-text hover:bg-button-primary-hover-background focus-visible:ring-button-primary-focus-ring",
      },
      {
        variant: "primary",
        appearance: "outline",
        className:
          "border-button-primary-outline-stroke bg-button-primary-outline-background text-button-primary-outline-text hover:bg-button-primary-outline-hover-background focus-visible:ring-button-outline-focus-ring",
      },
      {
        variant: "primary",
        appearance: "ghost",
        className:
          "text-button-primary-outline-text hover:bg-button-primary-outline-hover-background focus-visible:ring-button-outline-focus-ring",
      },
      {
        variant: "ghost",
        className:
          "text-button-primary-outline-text hover:bg-button-primary-outline-hover-background hover:text-button-outline-hover-text focus-visible:ring-button-outline-focus-ring",
      },

      /* ---------- Danger ---------- */
      {
        variant: "danger",
        appearance: "fill",
        className:
          "bg-button-error-background text-button-error-text hover:bg-button-error-hover-background focus-visible:ring-button-error-focus-ring",
      },
      {
        variant: "danger",
        appearance: "outline",
        className:
          "border-button-error-outline-stroke bg-button-error-outline-background text-button-error-outline-text hover:bg-button-error-outline-hover-background hover:text-button-error-outline-hover-text focus-visible:ring-button-error-outline-focus-ring",
      },
      {
        variant: "danger",
        appearance: "ghost",
        className:
          "text-button-error-outline-text hover:bg-button-error-outline-hover-background hover:text-button-error-outline-hover-text focus-visible:ring-button-error-outline-focus-ring",
      },

      /* ---------- Success ---------- */
      {
        variant: "success",
        appearance: "fill",
        className:
          "bg-button-success-background text-button-success-text hover:bg-button-success-hover-background focus-visible:ring-button-success-focus-ring",
      },
      {
        variant: "success",
        appearance: "outline",
        className:
          "border-button-success-outline-border bg-button-success-outline-background text-button-success-outline-text hover:bg-button-success-outline-hover-background hover:text-button-success-outline-hover-text focus-visible:ring-button-success-outline-focus-ring",
      },
      {
        variant: "success",
        appearance: "ghost",
        className:
          "text-button-success-outline-text hover:bg-button-success-outline-hover-background focus-visible:ring-button-success-outline-focus-ring",
      },

      /* ---------- Icon-only sizes ---------- */
      { iconOnly: true, size: "xs", className: "size-7" },
      { iconOnly: true, size: "sm", className: "size-8" },
      { iconOnly: true, size: "md", className: "size-9" },
      { iconOnly: true, size: "lg", className: "size-10" },
      { iconOnly: true, size: "xl", className: "size-11" },
      { iconOnly: true, size: "xxl", className: "size-12" },

      /* ---------- Regular sizes ---------- */
      { iconOnly: false, size: "xs", className: "h-7 gap-1.5 px-2 py-1 text-xs" },
      { iconOnly: false, size: "sm", className: "h-8 gap-1.5 px-3 py-1.5 text-xs" },
      { iconOnly: false, size: "md", className: "h-9 gap-1.5 px-3.5 py-2" },
      { iconOnly: false, size: "lg", className: "h-10 gap-1.5 px-3.5 py-2.5" },
      { iconOnly: false, size: "xl", className: "h-11 gap-1.5 px-4 py-3" },
      { iconOnly: false, size: "xxl", className: "h-12 gap-1 px-5 py-3 text-base" },
    ],
    defaultVariants: {
      variant: "primary",
      appearance: "fill",
      iconOnly: false,
      size: "md",
    },
  },
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonStyles>["variant"]>;
export type ButtonAppearance = NonNullable<VariantProps<typeof buttonStyles>["appearance"]>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonStyles>["size"]>;

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<VariantProps<typeof buttonStyles>, "iconOnly"> {
  /** Renders a spinner and disables the button while an action is in flight. */
  loading?: boolean;
  /** Force the square icon-only metric; auto-detected from the children. */
  iconOnly?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, appearance, size, iconOnly, loading, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        buttonStyles({
          variant,
          appearance,
          size,
          iconOnly: iconOnly ?? isIconOnlyChildren(children),
        }),
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});
