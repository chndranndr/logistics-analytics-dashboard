import type { QueryResult } from "@/lib/analytics/engine";
import { METRICS } from "@/lib/domain/metrics";
import type { ForecastResult } from "@/lib/forecast/engine";

const NUMBER_PATTERN = /\d[\d,]*(\.\d+)?/g;

export function extractNumbers(text: string): number[] {
  const matches = text.match(NUMBER_PATTERN);
  if (!matches) return [];
  return matches
    .map((m) => parseFloat(m.replace(/,/g, "")))
    .filter((n) => Number.isFinite(n));
}

export type EngineResult = QueryResult | ForecastResult;

export function isGrounded(
  text: string,
  result: EngineResult | readonly EngineResult[],
  question: string,
): boolean {
  const textNumbers = extractNumbers(text);
  if (textNumbers.length === 0) return true;

  const allowed = new Set<number>([
    ...extractNumbers(JSON.stringify(result)),
    ...extractNumbers(question),
  ]);

  return textNumbers.every((n) => allowed.has(n));
}

export function fallbackText(result: QueryResult | ForecastResult): string {
  if (result.kind === "forecast") {
    const h = result.forecast.length;
    return `Forecast for ${result.scopeLabel}: ${result.inventory.expectedDemand} units in ${h} months. Recommended: ${result.inventory.recommended} units.`;
  }

  const meta = METRICS[result.metric];
  if (result.rows.length === 0) {
    return `${meta.label}: no matching orders.`;
  }

  if (result.rows.length === 1) {
    const row = result.rows[0];
    const val = row.value === null ? "n/a" : row.value;
    return `${meta.label}: ${val} ${meta.unit} (${row.n} orders in the sample).`;
  }

  const nonNullRows = result.rows.filter((r) => r.value !== null);
  const highest =
    nonNullRows.length > 0
      ? nonNullRows.reduce((best, r) =>
          (r.value ?? -Infinity) > (best.value ?? -Infinity) ? r : best,
        )
      : result.rows[0];

  const highestVal = highest.value === null ? "n/a" : highest.value;
  const notes = result.notes.length > 0 ? ` Note: ${result.notes.join("; ")}.` : "";
  return `${meta.label} by ${result.groupBy}. The highest is ${highest.key} with ${highestVal} ${meta.unit}.${notes} See the chart and the table.`;
}
