"use client";

import type { QueryResult } from "@/lib/analytics/engine";
import { METRICS } from "@/lib/domain/metrics";
import type { ForecastResult } from "@/lib/forecast/engine";
import { ResultTable } from "@/components/result/ResultTable";

export type TraceSummary = {
  tool: "query" | "forecast" | null;
  toolInput: unknown | null;
};

function formatFilters(
  filters: Record<string, string[] | boolean> | undefined,
): string {
  if (!filters) return "None";
  const entries = Object.entries(filters);
  if (entries.length === 0) return "None";
  return entries
    .map(([key, val]) =>
      Array.isArray(val) ? `${key}: ${val.join(", ")}` : `${key}: ${String(val)}`,
    )
    .join("; ");
}

export function TracePanel({
  trace,
  result,
}: {
  trace: TraceSummary;
  result: QueryResult | ForecastResult | null;
}) {
  const isQuery = result?.kind === "query";
  const isForecast = result?.kind === "forecast";

  const metricLabel = isQuery
    ? METRICS[result.metric].label
    : isForecast
      ? METRICS.total_quantity.label
      : "None";

  const metricDefinition = isQuery
    ? METRICS[result.metric].definition
    : isForecast
      ? METRICS.total_quantity.definition
      : "No metric computed.";

  const dateRangeText = isQuery
    ? `${result.resolved.dateFrom} to ${result.resolved.dateTo}`
    : isForecast
      ? `${result.history[0]?.month ?? "2025-01"} to ${result.history[result.history.length - 1]?.month ?? "2025-12"} (forecast: ${result.forecast[0]?.month ?? ""} to ${result.forecast[result.forecast.length - 1]?.month ?? ""})`
      : "N/A";

  const filtersText = isQuery
    ? formatFilters(result.resolved.filters)
    : isForecast
      ? result.scopeLabel
      : "None";

  const dimensionText = isQuery
    ? result.groupBy ?? "None (overall)"
    : isForecast
      ? "month"
      : "None";

  const tableRows = isQuery
    ? result.rows
    : isForecast
      ? result.forecast.map((pt) => ({
          key: pt.month,
          value: pt.value,
          n: result.history.length,
        }))
      : [];

  const unit = isQuery
    ? METRICS[result.metric].unit
    : isForecast
      ? METRICS.total_quantity.unit
      : undefined;

  return (
    <details className="rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-700">
      <summary className="cursor-pointer select-none px-3 py-2 font-medium text-slate-800 hover:bg-slate-100">
        How this was answered
      </summary>
      <div className="space-y-3 border-t border-slate-200 bg-white p-3">
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-500">Tool</dt>
            <dd className="text-slate-900">{trace.tool ?? "none"}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Resolved date range</dt>
            <dd className="text-slate-900">{dateRangeText}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Filters</dt>
            <dd className="text-slate-900">{filtersText}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Dimension</dt>
            <dd className="text-slate-900">{dimensionText}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-slate-500">Metric</dt>
            <dd className="text-slate-900">
              <span className="font-medium">{metricLabel}:</span>{" "}
              {metricDefinition}
            </dd>
          </div>
        </dl>

        {trace.toolInput !== null && trace.toolInput !== undefined && (
          <div>
            <p className="mb-1 font-medium text-slate-500">Tool input</p>
            <pre className="overflow-x-auto rounded bg-slate-900 p-2.5 text-[11px] text-slate-100">
              {JSON.stringify(trace.toolInput, null, 2)}
            </pre>
          </div>
        )}

        {result && result.notes.length > 0 && (
          <div>
            <p className="mb-1 font-medium text-slate-500">Notes</p>
            <ul className="list-disc space-y-0.5 pl-4 text-slate-700">
              {result.notes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        {result && (
          <div>
            <p className="mb-1 font-medium text-slate-500">Result table</p>
            <ResultTable rows={tableRows} unit={unit} />
          </div>
        )}
      </div>
    </details>
  );
}
