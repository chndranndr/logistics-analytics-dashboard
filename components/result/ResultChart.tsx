"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { QueryResult, QueryRow } from "@/lib/analytics/engine";
import { METRICS } from "@/lib/domain/metrics";

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? value.toLocaleString("en-US")
    : value.toLocaleString("en-US", { maximumFractionDigits: 2 });
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
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-slate-900">{row.key}</p>
      <p className="text-slate-700">
        {row.value === null ? "n/a" : `${formatNumber(row.value)} ${unit}`}
      </p>
      <p className="text-slate-500">n = {row.n}</p>
    </div>
  );
}

export function ResultChart({ result }: { result: QueryResult }) {
  const meta = METRICS[result.metric];

  if (result.chart.type === "figure") {
    const row = result.rows[0];
    const displayValue =
      !row || row.value === null ? "n/a" : formatNumber(row.value);
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {meta.label}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900">
            {displayValue}
          </span>
          {row && row.value !== null && (
            <span className="text-sm font-medium text-slate-600">
              {meta.unit}
            </span>
          )}
        </div>
        {row && (
          <p className="mt-1 text-xs text-slate-500">Sample size: n = {row.n}</p>
        )}
      </div>
    );
  }

  if (result.rows.length === 0) {
    return (
      <p className="text-xs text-slate-500">No data points to chart.</p>
    );
  }

  if (result.chart.type === "line") {
    return (
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={result.rows}
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="key" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<QueryTooltip unit={meta.unit} />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
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
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="key"
                width={110}
                tick={{ fontSize: 11 }}
              />
              <Tooltip content={<QueryTooltip unit={meta.unit} />} />
              <Bar dataKey="value" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {result.rows.length > 12 && (
          <p className="text-xs text-slate-500">
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
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="key" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<QueryTooltip unit={meta.unit} />} />
          <Bar dataKey="value" fill="#2563eb" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
