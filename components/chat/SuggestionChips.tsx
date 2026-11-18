"use client";

import { MessageSquare } from "lucide-react";

export const SUGGESTED_QUESTIONS = [
  "Show delayed orders by week for the last 3 months",
  "Which carrier has the highest delay rate?",
  "How many orders were delivered late last month?",
  "What is the on-time rate by region?",
  "Predict demand for CRAYON for the next 4 months",
  "How much inventory should I plan for the next 3 months?",
] as const;

export function SuggestionChips({
  onSelect,
  disabled,
}: {
  onSelect: (question: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <MessageSquare size={12} aria-hidden />
        Try asking:
      </p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(q)}
            className="max-w-full rounded-full border border-border bg-surface-muted px-3 py-1.5 text-left text-xs text-text transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
