"use client";

import { useSearchParams } from "next/navigation";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import { useFilterNav } from "./FilterNavProvider";

type CarrierPoint = {
  key: string;
  value: number | null;
  n: number;
};

const SMALL_SAMPLE = 10;
const tickStyle = { fontSize: 11, fill: "var(--text-muted)" };

function CarrierTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: CarrierPoint }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-text">{item.key}</p>
      <p className="text-text">
        Delay rate: {item.value === null ? "n/a" : `${item.value}%`}
      </p>
      <p className="text-muted">n = {item.n} completed orders</p>
    </div>
  );
}

export function CarrierDelayChart({ data }: { data: CarrierPoint[] }) {
  const { setFilters } = useFilterNav();
  const selected = useSearchParams().get("carrier");

  const chartData = data.map((d) => ({
    ...d,
    label: `${d.key} (n=${d.n})`,
    plotValue: d.value ?? 0,
  }));

  function pickCarrier(index: unknown) {
    // Recharts 3 reports the hovered index as a string ("2"), so convert it.
    const item = data[Number(index)];
    if (!item) return;
    setFilters({ carrier: selected === item.key ? null : item.key });
  }

  const header = (
    <CardHeader
      title="Delay rate by carrier"
      hint="Share of completed orders delayed. (n = completed orders). Click a bar to filter"
    />
  );

  if (data.length === 0) {
    return (
      <Card>
        {header}
        <p className="mt-3 text-sm text-muted">No data</p>
      </Card>
    );
  }

  return (
    <Card>
      {header}
      <div className="mt-3 h-64 w-full cursor-pointer">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
            onClick={(state) => pickCarrier(state.activeTooltipIndex)}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={tickStyle}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={56}
              axisLine={false}
              tickLine={false}
            />
            <YAxis unit="%" tick={tickStyle} axisLine={false} tickLine={false} />
            <Tooltip content={<CarrierTooltip />} />
            <Bar dataKey="plotValue" name="Delay rate (%)" fill="var(--chart-4)">
              {chartData.map((d) => {
                const small = d.n < SMALL_SAMPLE;
                return (
                  <Cell
                    key={d.key}
                    fillOpacity={small ? 0.35 : selected && selected !== d.key ? 0.45 : 1}
                    stroke={small ? "var(--chart-4)" : undefined}
                    strokeDasharray={small ? "4 3" : undefined}
                    strokeWidth={small ? 1.5 : 0}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-muted">
        Faded bars: fewer than {SMALL_SAMPLE} completed orders
      </p>
    </Card>
  );
}
