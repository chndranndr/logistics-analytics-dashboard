import { Suspense } from "react";
import { CarrierDelayChart } from "@/components/dashboard/CarrierDelayChart";
import { DeliveryPerformanceChart } from "@/components/dashboard/DeliveryPerformanceChart";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { KpiCards, type KpiItem } from "@/components/dashboard/KpiCards";
import { OrderVolumeChart } from "@/components/dashboard/OrderVolumeChart";
import { QueryError, runQuery } from "@/lib/analytics/engine";
import type { QuerySpec } from "@/lib/analytics/spec";
import { getOrders } from "@/lib/data/orders";
import { REFERENCE_DATE, type MetricId } from "@/lib/domain/metrics";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const KPI_METRICS: MetricId[] = [
  "order_count",
  "delivered_count",
  "delayed_count",
  "on_time_rate",
  "avg_delivery_days",
];

function firstParam(
  value: string | string[] | undefined,
): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && value.length > 0) return value[0].trim();
  return "";
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function DashboardContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const fromParam = firstParam(params.from);
  const toParam = firstParam(params.to);
  const carrierParam = firstParam(params.carrier);
  const regionParam = firstParam(params.region);

  const orders = getOrders();
  const carriers = Array.from(new Set(orders.map((o) => o.carrier))).sort();
  const regions = Array.from(new Set(orders.map((o) => o.region))).sort();

  const filters: QuerySpec["filters"] = {};
  if (carrierParam) filters.carrier = [carrierParam];
  if (regionParam) filters.region = [regionParam];

  const validFrom = isIsoDate(fromParam) ? fromParam : "";
  const validTo = isIsoDate(toParam) ? toParam : "";
  const dateRange: QuerySpec["dateRange"] =
    validFrom || validTo
      ? {
          type: "absolute",
          from: validFrom || "2025-01-01",
          to: validTo || "2025-12-30",
        }
      : { type: "all" };

  const baseSpec: QuerySpec = {
    metric: "order_count",
    groupBy: null,
    filters,
    dateRange,
    sort: "natural",
    limit: null,
  };

  let filterError: string | null = null;
  let kpis: KpiItem[] = KPI_METRICS.map((id) => ({ id, value: null, n: 0 }));
  let volumeData: { key: string; value: number | null }[] = [];
  let performanceData: { month: string; delivered: number; delayed: number }[] =
    [];
  let carrierData: { key: string; value: number | null; n: number }[] = [];
  let carrierNotes: string[] = [];

  try {
    kpis = KPI_METRICS.map((metric) => {
      const res = runQuery({ ...baseSpec, metric, groupBy: null }, orders);
      const row = res.rows[0] ?? { value: null, n: 0 };
      return { id: metric, value: row.value, n: row.n };
    });

    const volumeRes = runQuery(
      { ...baseSpec, metric: "order_count", groupBy: "month", sort: "natural" },
      orders,
    );
    volumeData = volumeRes.rows.map((r) => ({ key: r.key, value: r.value }));

    const deliveredRes = runQuery(
      {
        ...baseSpec,
        metric: "delivered_count",
        groupBy: "month",
        sort: "natural",
      },
      orders,
    );
    const delayedRes = runQuery(
      {
        ...baseSpec,
        metric: "delayed_count",
        groupBy: "month",
        sort: "natural",
      },
      orders,
    );
    const delayedByMonth = new Map(
      delayedRes.rows.map((r) => [r.key, r.value ?? 0]),
    );
    performanceData = deliveredRes.rows.map((r) => ({
      month: r.key,
      delivered: r.value ?? 0,
      delayed: delayedByMonth.get(r.key) ?? 0,
    }));

    const carrierRes = runQuery(
      {
        ...baseSpec,
        metric: "delay_rate",
        groupBy: "carrier",
        sort: "value_desc",
      },
      orders,
    );
    carrierData = carrierRes.rows;
    carrierNotes = carrierRes.notes;
  } catch (err) {
    if (err instanceof QueryError) {
      filterError = err.message;
    } else {
      throw err;
    }
  }

  return (
    <div className="space-y-6">
      <FilterBar
        carriers={carriers}
        regions={regions}
        from={validFrom}
        to={validTo}
        carrier={carrierParam}
        region={regionParam}
      />

      {filterError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {filterError}
        </div>
      ) : (
        <>
          <KpiCards items={kpis} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <OrderVolumeChart data={volumeData} />
            <DeliveryPerformanceChart data={performanceData} />
          </div>

          <div>
            <CarrierDelayChart data={carrierData} />
            {carrierNotes.length > 0 && (
              <p className="mt-2 text-xs text-amber-700">
                Note: {carrierNotes.join("; ")}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Logistics Analytics Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Data: 2025-01-01 to 2025-12-30. Reference date: {REFERENCE_DATE}.
        </p>
      </header>

      <Suspense
        fallback={
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Loading dashboard...
          </div>
        }
      >
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
