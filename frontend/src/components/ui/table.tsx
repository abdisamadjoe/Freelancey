import { cn } from "@/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

const tableRootStyles = cva(
  "min-w-full border-separate border-spacing-0 overflow-clip border-border-primary text-left",
  {
    variants: {
      fullBleed: {
        true: "border-y",
        false: "rounded-lg border-none",
      },
    },
    defaultVariants: {
      fullBleed: false,
    },
  },
);

type TableRootProps = ComponentProps<"table"> & VariantProps<typeof tableRootStyles>;

export function TableRoot({ className, fullBleed, ...props }: TableRootProps) {
  return (
    <div className="overflow-x-auto">
      <table className={cn(tableRootStyles({ fullBleed }), className)} {...props} />
    </div>
  );
}

const tableHeaderStyles = cva(
  "text-title-50 [&_th]:border-t [&_th]:border-b [&_th]:border-border-primary [&_th]:text-xs",
);

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn(tableHeaderStyles(), className)} {...props} />;
}

const tableBodyStyle = cva();

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn(tableBodyStyle(), className)} {...props} />;
}

// Metrics every template table page applies to its headers and cells.
const tableHeadStyles = cva("px-6 py-2 text-xs leading-4 font-semibold text-text-secondary");

export function TableHead({ className, ...props }: ComponentProps<"th">) {
  return <th className={cn(tableHeadStyles(), className)} {...props} />;
}

const tableRowStyles = cva(
  "not-last:*:border-border-primary not-last:[&>td]:border-b not-last:[&>th]:border-b",
);

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn(tableRowStyles(), className)} {...props} />;
}

const tableCellStyles = cva("px-6 py-3 text-sm leading-5 font-medium text-text-primary");

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn(tableCellStyles(), className)} {...props} />;
}
