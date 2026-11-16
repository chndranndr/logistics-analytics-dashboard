import { METRICS, type MetricId } from "@/lib/domain/metrics";

export type KpiItem = {
  id: MetricId;
  value: number | null;
  n: number;
};

function formatKpiValue(id: MetricId, value: number | null): string {
  if (value === null) return "n/a";
  if (id === "on_time_rate" || id === "delay_rate") {
    return `${value.toFixed(1)}%`;
  }
  if (id === "avg_delivery_days") {
    return `${value.toFixed(2)} days`;
  }
  return value.toLocaleString("en-US");
}

export function KpiCards({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => {
        const meta = METRICS[item.id];
        return (
          <div
            key={item.id}
            className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-xs"
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {meta.label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {formatKpiValue(item.id, item.value)}
              </p>
            </div>
            <p className="mt-2 text-xs text-slate-500">{meta.definition}</p>
          </div>
        );
      })}
    </div>
  );
}
