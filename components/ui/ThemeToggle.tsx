"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const getSnapshot = () => document.documentElement.classList.contains("dark");
const getServerSnapshot = () => false;

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Storage unavailable (private mode, blocked): the class still toggles for this visit.
    }
  }

  const Icon = dark ? Sun : Moon;

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      onClick={toggle}
      className="rounded-md border border-border bg-surface p-2 text-muted hover:text-text transition-colors"
    >
      <Icon className="size-4" />
    </button>
  );
}
