"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";
const THEME_EVENT = "virro-theme-change";

function resolveTheme(): Theme {
  let storedTheme: string | null = null;
  try {
    storedTheme = window.localStorage.getItem("virro-theme");
  } catch {
    // Theme selection still works when browser storage is unavailable.
  }
  if (storedTheme === "light" || storedTheme === "dark") return storedTheme;
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem("virro-theme", theme);
  } catch {
    // Keep the active document themed even when persistence is unavailable.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(THEME_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function ThemeToggle({ label = "Cambiar tema" }: { label?: string }) {
  const theme = useSyncExternalStore(subscribe, resolveTheme, () => "dark");

  function toggleTheme() {
    const nextTheme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    applyTheme(nextTheme);
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={toggleTheme}
      className="grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-[var(--text)]"
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
