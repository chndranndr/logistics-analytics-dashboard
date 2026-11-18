"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { useFilterNav } from "@/components/dashboard/FilterNavProvider";
import type { Insight } from "@/lib/analytics/insights";

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  const { setFilters } = useFilterNav();

  if (insights.length === 0) return null;

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="size-4 text-warn" aria-hidden="true" />
        <CardHeader title="Needs attention" hint="Click to filter the dashboard" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {insights.map((insight) => (
          <button
            key={insight.id}
            type="button"
            onClick={() => setFilters({ ...insight.filter })}
            className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
          >
            <AlertTriangle
              className={`mt-0.5 size-4 shrink-0 ${insight.tone === "bad" ? "text-bad" : "text-warn"}`}
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-text">
                {insight.title}
              </span>
              <span className="block text-xs text-muted">{insight.detail}</span>
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}
