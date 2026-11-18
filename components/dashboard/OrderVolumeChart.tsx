"use client";

import { useId } from "react";
import { useSearchParams } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import { useFilterNav } from "./FilterNavProvider";
import { monthLabel, monthRange } from "./monthRange";

type Point = {
  key: string;
  value: number | null;
};

const tickStyle = { fontSize: 11, fill: "var(--text-muted)" };

export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string }>;
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-text">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-muted">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export function OrderVolumeChart({ data }: { data: Point[] }) {
  const { setFilters } = useFilterNav();
  const params = useSearchParams();
  const from = params.get("from");
  const to = params.get("to");
  const gradientId = `volume-${useId().replace(/:/g, "")}`;

  // Active only when the range is exactly this month (not a wider preset).
  const isActive = (key: string) => {
    const r = monthRange(key);
    return from === r.from && to === r.to;
  };

  function pickMonth(key: string) {
    setFilters(isActive(key) ? { from: null, to: null } : monthRange(key));
  }

  return (
    <Card>
      <CardHeader
        title="Order volume by month"
        hint="Total orders placed per month. Click a month to filter"
      />
      <div className="mt-3 h-64 w-full cursor-pointer">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
            onClick={(state) => {
              const key = data[Number(state.activeTooltipIndex)]?.key;
              if (key) pickMonth(key);
            }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="key"
              tickFormatter={monthLabel}
              tick={tickStyle}
              axisLine={false}
              tickLine={false}
            />
            <YAxis allowDecimals={false} tick={tickStyle} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              name="Orders"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={({ cx, cy, payload }) => (
                <circle
                  cx={cx}
                  cy={cy}
                  r={isActive(payload.key) ? 5 : 3}
                  fill="var(--chart-1)"
                />
              )}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
