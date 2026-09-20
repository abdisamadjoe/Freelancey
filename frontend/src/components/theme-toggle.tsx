"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Theme, THEME_STORAGE_KEY, applyTheme, getActiveTheme, getStoredTheme, getSystemTheme, nextTheme, setTheme } from "@/lib/theme";

/**
 * Light/dark switch. The first render is neutral (no icon guess) so server
 * and client markup match; the real state is read right after mount from the
 * <html> class that the inline script in the root layout already set.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setThemeState] = useState<Theme | null>(null);

  useEffect(() => {
    setThemeState(getActiveTheme());

    // Follow the OS while the user has not chosen, and follow other tabs when they do.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (getStoredTheme() === null) {
        const system = getSystemTheme();
        applyTheme(system);
        setThemeState(system);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) {
        const stored = getStoredTheme() ?? getSystemTheme();
        applyTheme(stored);
        setThemeState(stored);
      }
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const isDark = theme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={() => {
        const next = nextTheme(getActiveTheme());
        setTheme(next);
        setThemeState(next);
      }}
      title={label}
      aria-label={label}
      aria-pressed={theme === null ? undefined : isDark}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary focus-visible:ring-4 focus-visible:ring-button-outline-focus-ring outline-none",
        className,
      )}
    >
      {theme === null ? <span className="size-4" aria-hidden /> : isDark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </button>
  );
}
