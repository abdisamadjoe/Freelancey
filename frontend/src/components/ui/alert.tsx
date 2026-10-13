"use client";

import {
  Alert as TemplateAlert,
  AlertContent,
  AlertDescription,
  AlertIndicator,
  AlertTitle,
  type AlertStatus,
} from "@/components/tailgrids/core/alert";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

export type { AlertStatus };

/**
 * The template's Alert (tailgrids/core/alert.tsx): indicator, title and description,
 * behind the app's `<Alert status title icon actions>` props.
 */
export interface AlertProps extends Omit<ComponentProps<"div">, "title"> {
  status?: AlertStatus;
  title?: ReactNode;
  children?: ReactNode;
  /** Pass null to render the alert without an icon. */
  icon?: ReactNode;
  actions?: ReactNode;
}

export function Alert({ status = "default", title, children, icon, actions, className, ...props }: AlertProps) {
  return (
    // The template caps alerts at max-w-4xl for its showcase; in a full-width page they span the column.
    <TemplateAlert status={status} className={cn("max-w-none", className)} {...props}>
      {icon === null ? null : <AlertIndicator>{icon}</AlertIndicator>}
      <AlertContent className="min-w-0">
        {title ? <AlertTitle>{title}</AlertTitle> : null}
        {children ? <AlertDescription>{children}</AlertDescription> : null}
      </AlertContent>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </TemplateAlert>
  );
}
