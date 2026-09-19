import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

/**
 * Ported from the NextAdmin template's Table primitive
 * (dashboard/src/components/tailgrids/core/table.tsx), with the row-divider
 * rules rewritten for Tailwind v3 compatibility.
 */
export function TableRoot({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn(
          "w-full min-w-full border-separate border-spacing-0 text-left text-sm",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return (
    <thead
      className={cn(
        "[&_th]:border-b [&_th]:border-border-primary [&_th]:text-xs [&_th]:font-semibold",
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child_td]:border-b-0", className)} {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "transition-colors [&>td]:border-b [&>td]:border-border-primary [&>th]:border-b [&>th]:border-border-primary",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ComponentProps<"th">) {
  return <th className={cn("px-5 py-3.5 font-medium", className)} {...props} />;
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-5 py-3.5 font-medium text-text-100", className)} {...props} />;
}
