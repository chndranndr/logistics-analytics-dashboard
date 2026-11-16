"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type PerformancePoint = {
  month: string;
  delivered: number;
  delayed: number;
};

export function DeliveryPerformanceChart({
  data,
}: {
  data: PerformancePoint[];
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
      <h2 className="text-sm font-semibold text-slate-900">
        Delivery performance by month
      </h2>
      <p className="text-xs text-slate-500">
        Delivered (on time) vs delayed orders
      </p>
      <div className="mt-3 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="delivered"
              name="Delivered"
              stackId="status"
              fill="#16a34a"
            />
            <Bar
              dataKey="delayed"
              name="Delayed"
              stackId="status"
              fill="#dc2626"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
