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
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-slate-900">{pt.month}</p>
      {pt.history !== null && (
        <p className="text-slate-700">History: {pt.history} units</p>
      )}
      {pt.forecast !== null && pt.lower !== null && pt.upper !== null && (
        <>
          <p className="text-blue-700">Forecast: {pt.forecast} units</p>
          <p className="text-slate-500">
            Range: {pt.lower} to {pt.upper} units
          </p>
        </>
      )}
    </div>
  );
}

export function ForecastChart({ result }: { result: ForecastResult }) {
  const lastHistory = result.history[result.history.length - 1];

  const data: ForecastChartPoint[] = [
    ...result.history.map((pt, idx) => ({
      month: pt.month,
      history: pt.value,
      forecast: idx === result.history.length - 1 ? pt.value : null,
      lower: null,
      upper: null,
      bandBase: null,
      bandSpan: null,
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

  // Ensure the band starts cleanly without touching history points
  void lastHistory;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip content={<ForecastTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
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
            stackId="uncertainty"
            stroke="none"
            fill="#93c5fd"
            fillOpacity={0.4}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="history"
            name="History"
            stroke="#0f172a"
            strokeWidth={2}
            dot={{ r: 2.5 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            name="Forecast"
            stroke="#2563eb"
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
