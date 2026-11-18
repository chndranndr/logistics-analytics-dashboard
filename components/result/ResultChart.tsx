"use client";

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { QueryResult, QueryRow } from "@/lib/analytics/engine";
import {
  METRICS,
  RATE_OR_AVG_METRICS,
  SMALL_SAMPLE,
  type MetricId,
} from "@/lib/domain/metrics";

const TICK = { fontSize: 11, fill: "var(--text-muted)" };

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString("en-US")
    : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// Bars for small samples are drawn faded when the metric is a rate or average.
function sampleCells(rows: QueryRow[], dimSmall: boolean) {
  return rows.map((row) => (
    <Cell
      key={row.key}
      fillOpacity={dimSmall && row.n < SMALL_SAMPLE ? 0.35 : 1}
    />
  ));
}

function QueryTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ payload: QueryRow }>;
  unit: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-text">{row.key}</p>
      <p className="text-text">
        {row.value === null ? "n/a" : `${formatNumber(row.value)} ${unit}`}
      </p>
      <p className="text-muted">n = {row.n}</p>
    </div>
  );
}

export function ResultChart({
  result,
  metric,
}: {
  result: QueryResult;
  metric?: MetricId;
}) {
  const meta = METRICS[result.metric];
  const dimSmall = metric !== undefined && RATE_OR_AVG_METRICS.has(metric);

  if (result.chart.type === "figure") {
    const row = result.rows[0];
    const displayValue =
      !row || row.value === null ? "n/a" : formatNumber(row.value);
    return (
      <div className="rounded-md border border-border bg-surface-muted p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {meta.label}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-text">
            {displayValue}
          </span>
          {row && row.value !== null && (
            <span className="text-sm font-medium text-muted">
              {meta.unit}
            </span>
          )}
        </div>
        {row && (
          <p className="mt-1 text-xs text-muted">Sample size: n = {row.n}</p>
        )}
      </div>
    );
  }

  if (result.rows.length === 0) {
    return <p className="text-xs text-muted">No data points to chart.</p>;
  }

  if (result.chart.type === "line") {
    return (
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={result.rows}
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis dataKey="key" tick={TICK} />
            <YAxis tick={TICK} />
            <Tooltip content={<QueryTooltip unit={meta.unit} />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (result.chart.type === "bar_horizontal") {
    const top12 = result.rows.slice(0, 12);
    return (
      <div className="space-y-1">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={top12}
              margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis type="number" tick={TICK} />
              <YAxis
                type="category"
                dataKey="key"
                width={110}
                tick={TICK}
              />
              <Tooltip content={<QueryTooltip unit={meta.unit} />} />
              <Bar dataKey="value" fill="var(--chart-1)">
                {sampleCells(top12, dimSmall)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {result.rows.length > 12 && (
          <p className="text-xs text-muted">
            Showing top 12 of {result.rows.length} groups. See the full table in
            &ldquo;How this was answered&rdquo;.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={result.rows}
          margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis dataKey="key" tick={TICK} />
          <YAxis tick={TICK} />
          <Tooltip content={<QueryTooltip unit={meta.unit} />} />
          <Bar dataKey="value" fill="var(--chart-1)">
            {sampleCells(result.rows, dimSmall)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
