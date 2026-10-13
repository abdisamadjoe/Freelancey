"use client";

import { cn } from "@/lib/utils";
import { createContext, useContext, useId, useState, type ReactNode } from "react";

/**
 * Tabs primitive modelled on the NextAdmin template's Tabs
 * (dashboard/src/components/tailgrids/core/tabs.tsx).
 *
 * `variant="pill"`  → segmented control on a grey track (template default)
 * `variant="line"`  → underlined tabs, used for page sections
 */
type TabsVariant = "pill" | "line";
type TabsDirection = "horizontal" | "vertical";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  variant: TabsVariant;
  direction: TabsDirection;
  id: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs components must be used within <Tabs>");
  return ctx;
}

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: TabsVariant;
  direction?: TabsDirection;
  className?: string;
  children: ReactNode;
}

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  variant = "pill",
  direction = "horizontal",
  className,
  children,
}: TabsProps) {
  const [internal, setInternal] = useState(defaultValue ?? value ?? "");
  const id = useId();
  const current = value ?? internal;

  const setValue = (next: string) => {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };

  return (
    <TabsContext.Provider value={{ value: current, setValue, variant, direction, id }}>
      <div className={cn(direction === "vertical" && "flex flex-col", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({ children, className }: { children: ReactNode; className?: string }) {
  const { variant, direction } = useTabsContext();
  return (
    <div
      role="tablist"
      className={cn(
        // The template's tab list: a tinted track for pills, a bottom rule for underlined tabs.
        "flex max-w-full items-center overflow-x-auto overflow-y-hidden",
        variant === "pill" && "gap-1 rounded-lg bg-background-gray-secondary p-1",
        variant === "line" && "gap-2 border-b border-card-border",
        direction === "vertical" && "flex-col items-stretch",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Tab({
  value,
  children,
  icon,
  badge,
  className,
}: {
  value: string;
  children: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  className?: string;
}) {
  const ctx = useTabsContext();
  const isActive = ctx.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      id={`${ctx.id}-trigger-${value}`}
      aria-controls={`${ctx.id}-panel-${value}`}
      data-active={isActive}
      onClick={() => ctx.setValue(value)}
      className={cn(
        "flex shrink-0 items-center gap-2 px-3 text-sm font-medium whitespace-nowrap text-text-100 outline-hidden",
        "[&>svg]:size-5 [&>svg]:text-current!",
        ctx.variant === "pill" &&
          cn("rounded-md py-2", isActive && "bg-tab-active-background text-title-50 shadow-xs"),
        ctx.variant === "line" &&
          cn("py-3.5", isActive && "-mb-px border-b-2 border-primary-500 text-neutral-brand-color"),
        ctx.direction === "vertical" && "justify-start",
        className,
      )}
    >
      {icon}
      {children}
      {badge}
    </button>
  );
}

export function TabPanel({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useTabsContext();
  const isActive = ctx.value === value;
  if (!isActive) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.id}-panel-${value}`}
      aria-labelledby={`${ctx.id}-trigger-${value}`}
      className={className}
    >
      {children}
    </div>
  );
}
