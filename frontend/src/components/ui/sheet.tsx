"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Slide-over panel used for the mobile navigation and mobile detail views.
 * Modelled on the NextAdmin template's Sheet (dashboard/.../core/sheet.tsx).
 */
export function Sheet({
  open,
  onClose,
  children,
  side = "left",
  className,
  showCloseButton = true,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  side?: "left" | "right";
  className?: string;
  showCloseButton?: boolean;
  title?: string;
}) {
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
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "absolute top-0 h-full w-67.5 max-w-[85vw] border-card-border bg-card-surface-area shadow-lg",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          className,
        )}
      >
        {showCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="absolute top-4 right-4 z-10 flex size-8 items-center justify-center rounded-md text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary"
          >
            <X className="size-4" />
          </button>
        ) : null}
        {children}
      </div>
    </div>,
    document.body,
  );
}
