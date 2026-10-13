import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

/**
 * Ported from the NextAdmin template's Card primitive
 * (dashboard/src/components/tailgrids/core/card.tsx).
 */
export function Card({ children, className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border-[0.5px] border-card-border bg-card-background p-5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative flex w-full flex-wrap items-center justify-between gap-3",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      className={cn(
        "leading-6 font-semibold tracking-[-0.2px] text-text-primary",
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ children, className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn("mt-0.5 text-base leading-6 tracking-[-0.2px] text-text-secondary", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardAction({ children, className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("absolute top-5 right-5 text-text-50", className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ children, className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("p-6 text-text-primary", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("px-5 pb-5", className)} {...props}>
      {children}
    </div>
  );
}
