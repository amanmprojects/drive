"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "drive-theme";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyThemeClass(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
}

function resolveTheme(t: Theme): ResolvedTheme {
  if (t === "system") return systemPrefersDark() ? "dark" : "light";
  return t;
}

/** Storage-backed store for theme preference; notifies on writes + `storage` events. */
const themeStore = (() => {
  const listeners = new Set<() => void>();
  let storageListenerAttached = false;
  function subscribe(cb: () => void): () => void {
    listeners.add(cb);
    if (!storageListenerAttached && typeof window !== "undefined") {
      storageListenerAttached = true;
      window.addEventListener("storage", (e) => {
        if (e.key === STORAGE_KEY) listeners.forEach((l) => l());
      });
    }
    return () => listeners.delete(cb);
  }
  function getSnapshot(): Theme {
    return readStoredTheme();
  }
  function getServerSnapshot(): Theme {
    return "system";
  }
  function write(t: Theme): void {
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // ignore
    }
    listeners.forEach((l) => l());
  }
  return { subscribe, getSnapshot, getServerSnapshot, write };
})();

/** Tracks the OS `prefers-color-scheme` media query. */
const systemDarkStore = (() => {
  function subscribe(cb: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  }
  function getSnapshot(): boolean {
    return systemPrefersDark();
  }
  function getServerSnapshot(): boolean {
    return false;
  }
  return { subscribe, getSnapshot, getServerSnapshot };
})();

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getSnapshot,
    themeStore.getServerSnapshot
  );

  const systemDark = useSyncExternalStore(
    systemDarkStore.subscribe,
    systemDarkStore.getSnapshot,
    systemDarkStore.getServerSnapshot
  );

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // Sync DOM class with resolved theme.
  useEffect(() => {
    applyThemeClass(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((t: Theme) => {
    themeStore.write(t);
    // Apply eagerly so the UI doesn't wait for the re-render tick.
    applyThemeClass(resolveTheme(t));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/**
 * Inline script injected at the top of <body> to avoid a light-mode flash
 * before React hydrates. Reads the same storage key as the provider.
 */
export const themeInitScript = `(() => {
  try {
    const key = ${JSON.stringify(STORAGE_KEY)};
    const stored = localStorage.getItem(key);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = stored === 'dark' || stored === 'light'
      ? stored
      : (prefersDark ? 'dark' : 'light');
    const root = document.documentElement;
    if (resolved === 'dark') root.classList.add('dark');
    root.style.colorScheme = resolved;
  } catch (_) {}
})();`;
