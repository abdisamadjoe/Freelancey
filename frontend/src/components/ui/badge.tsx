import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

/** The template's badge (tailgrids/core/badge.tsx): same variants, sizes and icon-aware padding. */
export const badgeStyles = cva("inline-flex items-center gap-2 rounded-full font-medium [&>svg]:size-3", {
  variants: {
    size: {
      sm: "py-0.5 text-xs",
      md: "py-0.5 text-sm",
      lg: "py-1 text-sm",
    },
    prefixIcon: { true: "", false: "" },
    suffixIcon: { true: "", false: "" },
    color: {
      gray: "bg-badge-neutral-background text-badge-neutral-text [&>svg]:text-badge-neutral-icon-color",
      primary:
        "bg-badge-primary-background text-badge-primary-text [&>svg]:text-badge-primary-icon-color",
      error: "bg-badge-error-background text-badge-error-text [&>svg]:text-badge-error-icon-color",
      warning:
        "bg-badge-warning-background text-badge-warning-text [&>svg]:text-badge-warning-icon-color",
      success:
        "bg-badge-success-background text-badge-success-text [&>svg]:text-badge-success-icon-color",
      cyan: "bg-badge-cyan-background text-badge-cyan-text [&>svg]:text-badge-cyan-icon-color",
      sky: "bg-badge-sky-background text-badge-sky-text [&>svg]:text-badge-sky-icon-color",
      blue: "bg-badge-blue-background text-badge-blue-text [&>svg]:text-badge-blue-icon-color",
      violet:
        "bg-badge-violet-background text-badge-violet-text [&>svg]:text-badge-violet-icon-color",
      purple:
        "bg-badge-purple-background text-badge-purple-text [&>svg]:text-badge-purple-icon-color",
      pink: "bg-badge-pink-background text-badge-pink-text [&>svg]:text-badge-pink-icon-color",
      rose: "bg-badge-rose-background text-badge-rose-text [&>svg]:text-badge-rose-icon-color",
      orange:
        "bg-badge-orange-background text-badge-orange-text [&>svg]:text-badge-orange-icon-color",
    },
  },
  compoundVariants: [
    {
      prefixIcon: true,
      suffixIcon: true,
      size: "sm",
      className: "px-1.5",
    },
    {
      prefixIcon: true,
      suffixIcon: true,
      size: "md",
      className: "px-2",
    },
    {
      prefixIcon: true,
      suffixIcon: true,
      size: "lg",
      className: "px-2.5",
    },
    {
      prefixIcon: false,
      suffixIcon: false,
      size: "sm",
      className: "px-2",
    },
    {
      prefixIcon: false,
      suffixIcon: false,
      size: "md",
      className: "px-2.5",
    },
    {
      prefixIcon: false,
      suffixIcon: false,
      size: "lg",
      className: "px-3",
    },
    {
      prefixIcon: true,
      suffixIcon: false,
      size: "sm",
      className: "pr-2 pl-1.5",
    },
    {
      prefixIcon: true,
      suffixIcon: false,
      size: "md",
      className: "pr-2.5 pl-2",
    },
    {
      prefixIcon: true,
      suffixIcon: false,
      size: "lg",
      className: "pr-3 pl-2.5",
    },
    {
      prefixIcon: false,
      suffixIcon: true,
      size: "sm",
      className: "pr-1.5 pl-2",
    },
    {
      prefixIcon: false,
      suffixIcon: true,
      size: "md",
      className: "pr-2 pl-2.5",
    },
    {
      prefixIcon: false,
      suffixIcon: true,
      size: "lg",
      className: "pr-2.5 pl-3",
    },
  ],
  defaultVariants: {
    size: "sm",
    color: "primary",
  },
});

export type BadgeColor = NonNullable<VariantProps<typeof badgeStyles>["color"]>;
export type BadgeSize = NonNullable<VariantProps<typeof badgeStyles>["size"]>;

export interface BadgeProps
  extends Omit<ComponentProps<"span">, "color">,
    Omit<VariantProps<typeof badgeStyles>, "prefixIcon" | "suffixIcon"> {
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
}

export function Badge({ color, size, className, prefixIcon, suffixIcon, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        badgeStyles({ color, size, prefixIcon: Boolean(prefixIcon), suffixIcon: Boolean(suffixIcon) }),
        className,
      )}
      {...props}
    >
      {prefixIcon}
      {children}
      {suffixIcon}
    </span>
  );
}

/** A small filled status dot, used inside badges and tables. */
export function StatusDot({ className }: { className?: string }) {
  return <span className={cn("size-1.5 shrink-0 rounded-full bg-current", className)} />;
}
