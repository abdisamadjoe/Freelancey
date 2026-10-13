"use client";

import { cn } from "@/lib/utils";
import { Close } from "@tailgrids/icons";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Modal primitive modelled on the NextAdmin template's Dialog
 * (dashboard/src/components/tailgrids/core/dialog.tsx), implemented with a
 * portal so it works from anywhere in the app tree.
 */
export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";

const sizeStyles: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-140",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-5xl",
  "3xl": "max-w-6xl",
  full: "max-w-[92rem]",
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: ModalSize;
  /** Extra classes for the dialog panel. */
  className?: string;
  /** Set to false for destructive flows where an accidental backdrop click should not dismiss. */
  closeOnBackdrop?: boolean;
  /** Hides the built-in close button (use when the header renders its own). */
  hideCloseButton?: boolean;
  /** Allow the panel content to scroll instead of the page. */
  scrollable?: boolean;
}

export function Modal({
  open,
  onClose,
  children,
  size = "md",
  className,
  closeOnBackdrop = true,
  hideCloseButton = false,
  scrollable = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          // The template's dialog panel (tailgrids/core/dialog.tsx): one p-6 frame, no inner dividers.
          "relative z-10 my-auto w-full rounded-xl border border-border-primary bg-background-white-primary p-6 shadow-lg outline-none",
          sizeStyles[size],
          scrollable && "max-h-[calc(100vh-3rem)] overflow-y-auto",
          className,
        )}
      >
        {!hideCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 z-10 flex size-7 items-center justify-center rounded-md text-text-100 opacity-70 transition-opacity outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-primary-500 disabled:pointer-events-none [&>svg]:size-5"
          >
            <Close />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ModalHeader({
  title,
  description,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 pr-8 text-left", className)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        {title ? <h2 className="text-lg leading-none font-semibold text-title-50">{title}</h2> : null}
        {description ? <p className="text-sm text-text-100">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("py-4 text-sm text-text-100", className)}>{children}</div>;
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end", className)}>
      {children}
    </div>
  );
}
