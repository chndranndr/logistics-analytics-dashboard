"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type CarrierPoint = {
  key: string;
  value: number | null;
  n: number;
};

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
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-slate-900">{item.key}</p>
      <p className="text-slate-700">
        Delay rate: {item.value === null ? "n/a" : `${item.value}%`}
      </p>
      <p className="text-slate-500">n = {item.n} completed orders</p>
    </div>
  );
}

export function CarrierDelayChart({ data }: { data: CarrierPoint[] }) {
  const chartData = data.map((d) => ({
    ...d,
    plotValue: d.value ?? 0,
  }));

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
      <h2 className="text-sm font-semibold text-slate-900">
        Delay rate by carrier
      </h2>
      <p className="text-xs text-slate-500">
        Percentage of completed orders delayed (hover for sample size n)
      </p>
      <div className="mt-3 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="key" tick={{ fontSize: 11 }} />
            <YAxis unit="%" tick={{ fontSize: 11 }} />
            <Tooltip content={<CarrierTooltip />} />
            <Bar dataKey="plotValue" name="Delay rate (%)" fill="#ea580c" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
