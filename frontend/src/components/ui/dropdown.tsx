"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Lightweight dropdown menu modelled on the NextAdmin template's DropdownMenu
 * (dashboard/src/components/tailgrids/core/dropdown.tsx).
 */
export interface DropdownMenuProps {
  /** The trigger element. Receives the click handler through a wrapper span. */
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
  contentClassName?: string;
  /** Width of the panel; defaults to min-w-44. */
  sideOffset?: number;
}

export function DropdownMenu({
  trigger,
  children,
  align = "end",
  className,
  contentClassName,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative inline-flex", className)}>
      {/* The trigger keeps its own semantics; this span only forwards the toggle. */}
      <span
        className="contents"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </span>
      {open ? (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={cn(
            "absolute top-[calc(100%+6px)] z-40 min-w-40 overflow-clip rounded-xl border border-card-border bg-background-white-secondary shadow-md outline-hidden",
            align === "end" ? "right-0" : "left-0",
            contentClassName,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  onSelect,
  className,
  destructive,
  icon,
  disabled,
}: {
  children: ReactNode;
  onSelect?: () => void;
  className?: string;
  destructive?: boolean;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        // The template's menu item (tailgrids/core/dropdown.tsx).
        "group flex w-full cursor-default items-center gap-3 rounded-md px-1.5 py-1 text-left text-sm outline-hidden",
        destructive
          ? "text-button-error-outline-text hover:bg-button-error-outline-background"
          : "text-text-50 hover:bg-background-gray-secondary_alt focus:bg-background-gray-secondary_alt focus:text-title-50",
        disabled && "pointer-events-none text-text-disable",
        className,
      )}
    >
      {icon ? <span className="shrink-0 [&>svg]:size-4">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </button>
  );
}

export function DropdownMenuLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("px-3 py-2 text-sm text-text-100", className)}>
      {children}
    </p>
  );
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn("h-px border-none bg-border-secondary-alt", className)} role="separator" />;
}
