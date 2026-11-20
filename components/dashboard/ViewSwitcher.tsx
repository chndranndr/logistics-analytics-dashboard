"use client";

import { useState, type ReactNode } from "react";

const MODES = [
  { id: "chart", label: "Chart" },
  { id: "table", label: "Table" },
  { id: "both", label: "Chart + Table" },
] as const;

type Mode = (typeof MODES)[number]["id"];

/** Toggles between the charts, the data table, or both. Both are rendered by the server. */
export function ViewSwitcher({
  charts,
  table,
}: {
  charts: ReactNode;
  table: ReactNode;
}) {
  const [mode, setMode] = useState<Mode>("chart");

  return (
    <div className="space-y-4">
      <div
        role="group"
        aria-label="View mode"
        className="inline-flex rounded-lg border border-border bg-surface p-0.5"
      >
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={mode === m.id}
            onClick={() => setMode(m.id)}
            className={`rounded-md px-3 py-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-accent ${
              mode === m.id
                ? "bg-accent-soft text-accent"
                : "text-muted hover:text-text"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {mode !== "table" && charts}
      {mode !== "chart" && table}
    </div>
  );
}
