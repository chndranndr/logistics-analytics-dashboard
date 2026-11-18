import { AlertTriangle } from "lucide-react";
import type { QueryRow } from "@/lib/analytics/engine";
import {
  RATE_OR_AVG_METRICS,
  SMALL_SAMPLE,
  type MetricId,
} from "@/lib/domain/metrics";

function formatCellValue(value: number | null, unit?: string): string {
  if (value === null) return "n/a";
  const formatted = Number.isInteger(value)
    ? value.toLocaleString("en-US")
    : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return unit ? `${formatted} ${unit}` : formatted;
}

export function ResultTable({
  rows,
  unit,
  metric,
}: {
  rows: QueryRow[];
  unit?: string;
  metric?: MetricId;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-xs text-muted">No rows in result table.</p>
    );
  }

  const flagSmall = metric !== undefined && RATE_OR_AVG_METRICS.has(metric);

  return (
    <div className="max-h-64 overflow-auto rounded-md border border-border">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-surface-muted text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">Key</th>
            <th className="px-3 py-2 text-right font-medium">Value</th>
            <th className="px-3 py-2 text-right font-medium">n</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface">
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="px-3 py-1.5 font-medium text-text">
                {row.key}
                {flagSmall && row.n < SMALL_SAMPLE && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-normal text-warn">
                    <AlertTriangle size={12} aria-hidden />
                    Small sample
                  </span>
                )}
              </td>
              <td className="px-3 py-1.5 text-right text-text">
                {formatCellValue(row.value, unit)}
              </td>
              <td className="px-3 py-1.5 text-right text-muted">
                {row.n}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
