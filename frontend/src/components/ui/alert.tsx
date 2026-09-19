import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

/**
 * Ported from the NextAdmin template's Alert primitive
 * (dashboard/src/components/tailgrids/core/alert.tsx).
 */
export const alertStyles = cva("flex w-full items-start gap-3 rounded-lg border px-4 py-3.5", {
  variants: {
    status: {
      default: "border-alert-default-border bg-alert-default-background",
      success: "border-alert-success-border bg-alert-success-background",
      warning: "border-alert-warning-border bg-alert-warning-background",
      error: "border-alert-danger-border bg-alert-danger-background",
      info: "border-alert-info-border bg-alert-info-background",
    },
  },
  defaultVariants: { status: "default" },
});

export type AlertStatus = NonNullable<VariantProps<typeof alertStyles>["status"]>;

const iconStyles: Record<AlertStatus, string> = {
  default: "bg-alert-default-icon-background",
  success: "bg-alert-success-icon-background",
  warning: "bg-alert-warning-icon-background",
  error: "bg-alert-danger-icon-background",
  info: "bg-alert-info-icon-background",
};

const titleStyles: Record<AlertStatus, string> = {
  default: "text-alert-default-title",
  success: "text-alert-success-title",
  warning: "text-alert-warning-title",
  error: "text-alert-danger-title",
  info: "text-alert-info-title",
};

const descriptionStyles: Record<AlertStatus, string> = {
  default: "text-alert-default-description",
  success: "text-alert-success-description",
  warning: "text-alert-warning-description",
  error: "text-alert-danger-description",
  info: "text-alert-info-description",
};

const ICONS = {
  default: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
  info: Info,
} as const;

export interface AlertProps extends Omit<ComponentProps<"div">, "title"> {
  status?: AlertStatus;
  title?: ReactNode;
  children?: ReactNode;
  /** Pass null to render the alert without an icon. */
  icon?: ReactNode;
  actions?: ReactNode;
}

export function Alert({
  status = "default",
  title,
  children,
  icon,
  actions,
  className,
  ...props
}: AlertProps) {
  const Icon = ICONS[status];

  return (
    <div role="alert" className={cn(alertStyles({ status }), className)} {...props}>
      {icon === null ? null : (
        <span
          aria-hidden
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg text-white-100 [&>svg]:size-4",
            iconStyles[status],
          )}
        >
          {icon ?? <Icon />}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title ? <p className={cn("text-sm font-medium", titleStyles[status])}>{title}</p> : null}
        {children ? (
          <div className={cn("text-sm leading-5", descriptionStyles[status])}>{children}</div>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
