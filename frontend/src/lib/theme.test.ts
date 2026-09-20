import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme, getActiveTheme, getStoredTheme, nextTheme, setTheme, themeInitScript } from "./theme";

function fakeDom(opts: { stored?: string | null; systemDark?: boolean; storageThrows?: boolean }) {
  const classes = new Set<string>();
  const root = {
    classList: {
      toggle: (name: string, force?: boolean) => {
        if (force === undefined ? !classes.has(name) : force) classes.add(name);
        else classes.delete(name);
      },
      contains: (name: string) => classes.has(name),
    },
    style: { colorScheme: "" },
  };
  const store = new Map<string, string>();
  if (opts.stored) store.set("theme", opts.stored);
  const localStorage = {
    getItem: (k: string) => {
      if (opts.storageThrows) throw new Error("denied");
      return store.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (opts.storageThrows) throw new Error("denied");
      store.set(k, v);
    },
  };
  const matchMedia = (q: string) => ({ matches: q.includes("dark") && !!opts.systemDark });
  vi.stubGlobal("document", { documentElement: root });
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", { matchMedia });
  return { root, classes, store };
}

afterEach(() => vi.unstubAllGlobals());

describe("themeInitScript (runs before first paint)", () => {
  const run = () => new Function(themeInitScript)();

  it("uses a saved dark choice even when the OS is light", () => {
    const d = fakeDom({ stored: "dark", systemDark: false });
    run();
    expect(d.classes.has("dark")).toBe(true);
    expect(d.root.style.colorScheme).toBe("dark");
  });

  it("uses a saved light choice even when the OS is dark", () => {
    const d = fakeDom({ stored: "light", systemDark: true });
    d.classes.add("dark");
    run();
    expect(d.classes.has("dark")).toBe(false);
    expect(d.root.style.colorScheme).toBe("light");
  });

  it("follows the OS when nothing is saved", () => {
    const dark = fakeDom({ systemDark: true });
    run();
    expect(dark.classes.has("dark")).toBe(true);
    const light = fakeDom({ systemDark: false });
    run();
    expect(light.classes.has("dark")).toBe(false);
  });

  it("never throws if storage is blocked", () => {
    fakeDom({ storageThrows: true, systemDark: true });
    expect(run).not.toThrow();
  });
});

describe("theme helpers", () => {
  beforeEach(() => fakeDom({}));

  it("ignores junk in storage", () => {
    fakeDom({ stored: "purple" });
    expect(getStoredTheme()).toBeNull();
    fakeDom({ stored: "dark" });
    expect(getStoredTheme()).toBe("dark");
  });

  it("treats blocked storage as no preference", () => {
    fakeDom({ storageThrows: true });
    expect(getStoredTheme()).toBeNull();
  });

  it("setTheme applies the theme and remembers it", () => {
    const d = fakeDom({});
    setTheme("dark");
    expect(d.classes.has("dark")).toBe(true);
    expect(d.store.get("theme")).toBe("dark");
    setTheme("light");
    expect(d.classes.has("dark")).toBe(false);
    expect(d.store.get("theme")).toBe("light");
  });

  it("still switches for this visit when storage is blocked", () => {
    const d = fakeDom({ storageThrows: true });
    expect(() => setTheme("dark")).not.toThrow();
    expect(d.classes.has("dark")).toBe(true);
    expect(d.root.style.colorScheme).toBe("dark");
  });

  it("reads the active theme from the page, not from storage", () => {
    const d = fakeDom({ stored: "light" });
    applyTheme("dark");
    expect(d.classes.has("dark")).toBe(true);
    expect(getActiveTheme()).toBe("dark");
  });

  it("flips between the two themes", () => {
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
  });
});
