"use client";
import { MoonIcon, SunIcon } from "@/components/common/header/icons";
import { Button } from "@/components/tailgrids/core/button";
import {
  type Theme,
  THEME_STORAGE_KEY,
  applyTheme,
  getActiveTheme,
  getStoredTheme,
  getSystemTheme,
  nextTheme,
  setTheme,
} from "@/lib/theme";
import { cn } from "@/utils/cn";
import { useEffect, useState } from "react";

export default function ThemeToggle({ className }: { className?: string }) {
  // The first render is neutral so server and client markup match; the real theme is read right after mount.
  const [theme, setThemeState] = useState<Theme | null>(null);

  useEffect(() => {
    setThemeState(getActiveTheme());

    // Follow the OS while no choice is saved, and other tabs when one is.
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

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <Button
      iconOnly
      appearance="outline"
      aria-label={label}
      onClick={() => {
        const next = nextTheme(getActiveTheme());
        setTheme(next);
        setThemeState(next);
      }}
      className={cn(
        "size-10 rounded-lg border border-card-border bg-card-background text-icon-primary shadow-xs outline-none focus-visible:border-input-primary-focus-border focus-visible:ring-4 focus-visible:ring-input-primary-focus-border/20 [&>svg]:size-auto",
        className,
      )}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
