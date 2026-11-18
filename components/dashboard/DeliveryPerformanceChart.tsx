"use client";

import { useSearchParams } from "next/navigation";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import { useFilterNav } from "./FilterNavProvider";
import { ChartTooltip } from "./OrderVolumeChart";
import { monthLabel, monthRange } from "./monthRange";

type PerformancePoint = {
  month: string;
  delivered: number;
  delayed: number;
};

const tickStyle = { fontSize: 11, fill: "var(--text-muted)" };

export function DeliveryPerformanceChart({
  data,
}: {
  data: PerformancePoint[];
}) {
  const { setFilters } = useFilterNav();
  const params = useSearchParams();
  const from = params.get("from");
  const to = params.get("to");

  // A month is "selected" only when the range is exactly that month,
  // so presets like "Last 3 months" do not dim anything.
  const isActive = (key: string) => {
    const r = monthRange(key);
    return from === r.from && to === r.to;
  };
  const monthSelected = data.some((d) => isActive(d.month));
  const opacity = (key: string) => (monthSelected && !isActive(key) ? 0.4 : 1);

  function pickMonth(key: string) {
    setFilters(isActive(key) ? { from: null, to: null } : monthRange(key));
  }

  return (
    <Card>
      <CardHeader
        title="Delivery performance by month"
        hint="Delivered (on time) vs delayed orders. Click a month to filter"
      />
      <div className="mt-3 h-64 w-full cursor-pointer">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
            onClick={(state) => {
              const key = data[Number(state.activeTooltipIndex)]?.month;
              if (key) pickMonth(key);
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={monthLabel}
              tick={tickStyle}
              axisLine={false}
              tickLine={false}
            />
            <YAxis allowDecimals={false} tick={tickStyle} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="delivered" name="Delivered" stackId="status" fill="var(--chart-2)">
              {data.map((d) => (
                <Cell key={d.month} fillOpacity={opacity(d.month)} />
              ))}
            </Bar>
            <Bar
              dataKey="delayed"
              name="Delayed"
              stackId="status"
              fill="var(--chart-3)"
              radius={[4, 4, 0, 0]}
            >
              {data.map((d) => (
                <Cell key={d.month} fillOpacity={opacity(d.month)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
