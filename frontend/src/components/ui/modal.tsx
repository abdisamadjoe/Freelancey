"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
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
          "relative z-10 my-auto w-full rounded-xl border border-card-border bg-background-white-primary shadow-lg outline-none",
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
            className="absolute top-4 right-4 z-10 flex size-8 items-center justify-center rounded-md text-icon-tertiary transition-colors hover:bg-background-gray-secondary_alt hover:text-text-primary focus-visible:ring-4 focus-visible:ring-button-outline-focus-ring focus-visible:outline-none"
          >
            <X className="size-4" />
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
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-card-border px-6 py-5",
        className,
      )}
    >
      <div className="min-w-0">
        {title ? (
          <h2 className="text-lg leading-6 font-semibold tracking-[-0.2px] text-text-primary">
            {title}
          </h2>
        ) : null}
        {description ? (
          <p className="mt-1 text-sm leading-5 text-text-tertiary">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-6 py-5", className)}>{children}</div>;
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2 border-t border-card-border bg-background-gray-primary px-6 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
