"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ForecastResult } from "@/lib/forecast/engine";

const TICK = { fontSize: 11, fill: "var(--text-muted)" };

type ForecastChartPoint = {
  month: string;
  history: number | null;
  forecast: number | null;
  lower: number | null;
  upper: number | null;
  bandBase: number | null;
  bandSpan: number | null;
};

function ForecastTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ForecastChartPoint }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-text">{pt.month}</p>
      {pt.history !== null && (
        <p className="text-text">History: {pt.history} units</p>
      )}
      {pt.forecast !== null && pt.lower !== null && pt.upper !== null && (
        <>
          <p className="text-accent">Forecast: {pt.forecast} units</p>
          <p className="text-muted">
            Range: {pt.lower} to {pt.upper} units
          </p>
        </>
      )}
    </div>
  );
}

export function ForecastChart({ result }: { result: ForecastResult }) {
  const data: ForecastChartPoint[] = [
    ...result.history.map((pt, idx) => ({
      month: pt.month,
      history: pt.value,
      forecast: idx === result.history.length - 1 ? pt.value : null,
      lower: null,
      upper: null,
      // The last observed month has no uncertainty, so the band fans out from it.
      bandBase: idx === result.history.length - 1 ? pt.value : null,
      bandSpan: idx === result.history.length - 1 ? 0 : null,
    })),
    ...result.forecast.map((pt) => ({
      month: pt.month,
      history: null,
      forecast: pt.value,
      lower: pt.lower,
      upper: pt.upper,
      bandBase: pt.lower,
      bandSpan: Math.max(0, pt.upper - pt.lower),
    })),
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis dataKey="month" tick={TICK} />
          <YAxis allowDecimals={false} tick={TICK} />
          <Tooltip content={<ForecastTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }} />
          <Area
            type="monotone"
            dataKey="bandBase"
            stackId="uncertainty"
            stroke="none"
            fill="transparent"
            legendType="none"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="bandSpan"
            name="Uncertainty band"
            legendType="square"
            stackId="uncertainty"
            stroke="none"
            fill="var(--chart-1)"
            fillOpacity={0.2}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="history"
            name="History"
            stroke="var(--text)"
            strokeWidth={2}
            dot={{ r: 2.5 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            name="Forecast"
            stroke="var(--chart-1)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3 }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
